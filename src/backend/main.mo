import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Random "mo:core/Random";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Float "mo:core/Float";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  type User = {
    id : Nat;
    anonymousId : Text;
    username : ?Text;
    createdAt : Int;
    isOnline : Bool;
  };

  public type UserProfile = {
    anonymousId : Text;
    username : ?Text;
    isOnline : Bool;
  };

  public type PublicUser = {
    anonymousId : Text;
    username : ?Text;
    isOnline : Bool;
    lat : ?Float;
    lon : ?Float;
  };

  public type Message = {
    id : Nat;
    senderId : Text;
    receiverId : Text;
    content : Text;
    timestamp : Int;
    isGhost : Bool;
    ghostDeleteAt : ?Int;
  };

  public type MatchStatus = {
    #NotInQueue;
    #Waiting : { joinedAt : Int };
    #Matched : { sessionId : Nat; partnerAnonId : Text };
    #TimedOut;
  };

  public type RandomSession = {
    id : Nat;
    user1AnonId : Text;
    user2AnonId : Text;
    startedAt : Int;
    isActive : Bool;
  };

  public type RandomMessage = {
    id : Nat;
    sessionId : Nat;
    senderAnonId : Text;
    content : Text;
    timestamp : Int;
  };

  public type RandomVoiceMessage = {
    id : Nat;
    sessionId : Nat;
    senderAnonId : Text;
    audioHash : Text;
    duration : Nat;
    timestamp : Int;
  };

  public type VoiceMessage = {
    id : Nat;
    senderId : Text;
    receiverId : Text;
    audioHash : Text;
    duration : Nat;
    timestamp : Int;
  };

  // =====================
  // P2P TRADING TYPES
  // =====================

  public type ListingStatus = {
    #Active;
    #Locked;
    #Sold;
    #Cancelled;
  };

  public type TradeStatus = {
    #Pending;
    #PaymentSent;
    #Confirmed;
    #Rejected;
    #Disputed;
    #Cancelled;
  };

  public type P2PListing = {
    id : Nat;
    sellerPrincipal : Principal;
    sellerAnonId : Text;
    listedAnonId : Text;
    price : Text;
    iban : Text;
    status : ListingStatus;
    createdAt : Int;
  };

  public type P2PTrade = {
    id : Nat;
    listingId : Nat;
    buyerPrincipal : Principal;
    buyerAnonId : Text;
    sellerPrincipal : Principal;
    sellerAnonId : Text;
    listedAnonId : Text;
    price : Text;
    iban : Text;
    status : TradeStatus;
    proofScreenshotHash : ?Text;
    referenceNumber : ?Text;
    createdAt : Int;
    paymentSentAt : ?Int;
  };

  var userIdCounter = 0;
  var messageIdCounter = 0;
  let users = Map.empty<Principal, User>();
  let usedIds = Map.empty<Text, ()>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let userLocations = Map.empty<Principal, (Float, Float)>();
  let anonIdToPrincipal = Map.empty<Text, Principal>();
  let messages = Map.empty<Nat, Message>();
  let voiceMessages = Map.empty<Nat, VoiceMessage>();
  let blockedUsers = Map.empty<Principal, [Text]>();
  let reports = Map.empty<Nat, (Text, Text, Text)>();
  var reportIdCounter = 0;

  // --- Random Matching ---
  let matchQueue = Map.empty<Principal, Int>();
  var voiceMessageIdCounter = 0;
  var sessionIdCounter = 0;
  let randomSessions = Map.empty<Nat, RandomSession>();
  let principalToSession = Map.empty<Principal, Nat>();
  var randomMsgIdCounter = 0;
  let randomMessages = Map.empty<Nat, RandomMessage>();
  var randomVoiceMsgIdCounter = 0;
  let randomVoiceMessages = Map.empty<Nat, RandomVoiceMessage>();

  // --- P2P Trading ---
  let p2pListings = Map.empty<Nat, P2PListing>();
  let p2pTrades = Map.empty<Nat, P2PTrade>();
  var listingIdCounter = 0;
  var tradeIdCounter = 0;

  let MATCH_TIMEOUT_NS : Int = 30_000_000_000;
  let P2P_TRADE_TIMEOUT_NS : Int = 900_000_000_000; // 15 minutes

  func padTo4(n : Nat) : Text {
    let s = n.toText();
    let len = s.size();
    if (len >= 4) {
      s;
    } else {
      var pad = "";
      var i = len;
      while (i < 4) {
        pad #= "0";
        i += 1;
      };
      pad # s;
    };
  };

  func generateUniqueId() : async Text {
    func generateUnsafeId() : async Text {
      let num = await Random.natRange(0, 100000000);
      let first4 = num / 10000;
      let last4 = num % 10000;
      "+777 " # padTo4(first4) # " " # padTo4(last4);
    };
    var id = await generateUnsafeId();
    while (usedIds.containsKey(id)) {
      id := await generateUnsafeId();
    };
    id;
  };

  public shared ({ caller }) func register() : async User {
    if (users.containsKey(caller)) {
      switch (users.get(caller)) {
        case (null) { Runtime.trap("Inconsistent state") };
        case (?user) { return user };
      };
    };
    let anonymousId = await generateUniqueId();
    usedIds.add(anonymousId, ());
    let newUser : User = {
      id = userIdCounter;
      anonymousId = anonymousId;
      username = null;
      createdAt = Time.now();
      isOnline = true;
    };
    users.add(caller, newUser);
    anonIdToPrincipal.add(anonymousId, caller);
    userIdCounter += 1;
    let profile : UserProfile = {
      anonymousId = anonymousId;
      username = null;
      isOnline = true;
    };
    userProfiles.add(caller, profile);
    newUser;
  };

  public query ({ caller }) func getMe() : async ?User {
    users.get(caller);
  };

  public shared ({ caller }) func updateUsername(username : Text) : async () {
    switch (users.get(caller)) {
      case (null) { Runtime.trap("User must register first.") };
      case (?user) {
        let updatedUser = { user with username = ?username };
        users.add(caller, updatedUser);
        switch (userProfiles.get(caller)) {
          case (?profile) {
            userProfiles.add(caller, { profile with username = ?username });
          };
          case (null) {};
        };
      };
    };
  };

  public shared ({ caller }) func setOnline(isOnline : Bool) : async () {
    switch (users.get(caller)) {
      case (null) { Runtime.trap("User must register first.") };
      case (?user) {
        users.add(caller, { user with isOnline });
        switch (userProfiles.get(caller)) {
          case (?profile) {
            userProfiles.add(caller, { profile with isOnline });
          };
          case (null) {};
        };
      };
    };
  };

  public query ({ caller }) func listUsers() : async [User] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can list all users");
    };
    users.values().toArray();
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
    switch (users.get(caller)) {
      case (?user) {
        users.add(caller, { user with username = profile.username; isOnline = profile.isOnline });
      };
      case (null) {};
    };
  };

  public shared ({ caller }) func updateLocation(lat : Float, lon : Float) : async () {
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?_) {
        userLocations.add(caller, (lat, lon));
      };
    };
  };

  public query func listPublicUsers() : async [PublicUser] {
    userProfiles.entries().map(func((p, profile) : (Principal, UserProfile)) : PublicUser {
      let loc = userLocations.get(p);
      {
        anonymousId = profile.anonymousId;
        username = profile.username;
        isOnline = profile.isOnline;
        lat = switch (loc) { case (?l) { ?l.0 }; case (null) { null } };
        lon = switch (loc) { case (?l) { ?l.1 }; case (null) { null } };
      }
    }).toArray();
  };

  public query ({ caller }) func findUserByAnonId(anonId : Text) : async ?UserProfile {
    switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first to search for users") };
      case (?_) {
        switch (anonIdToPrincipal.get(anonId)) {
          case (null) { null };
          case (?p) { userProfiles.get(p) };
        };
      };
    };
  };

  func textArrayContains(arr : [Text], item : Text) : Bool {
    switch (arr.find(func(x : Text) : Bool { x == item })) {
      case (null) { false };
      case (?_) { true };
    };
  };

  func isBlocked(blocker : Principal, anonId : Text) : Bool {
    switch (blockedUsers.get(blocker)) {
      case (null) { false };
      case (?list) { textArrayContains(list, anonId) };
    };
  };

  public shared ({ caller }) func sendMessage(receiverAnonId : Text, content : Text, isGhost : Bool) : async Nat {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
    let receiverPrincipal = switch (anonIdToPrincipal.get(receiverAnonId)) {
      case (null) { Runtime.trap("Receiver not found") };
      case (?p) { p };
    };
    if (isBlocked(receiverPrincipal, callerUser.anonymousId)) {
      Runtime.trap("You are blocked by this user");
    };
    let now = Time.now();
    let ghostDeleteAt : ?Int = if (isGhost) { ?(now + 60_000_000_000) } else { null };
    let msg : Message = {
      id = messageIdCounter;
      senderId = callerUser.anonymousId;
      receiverId = receiverAnonId;
      content = content;
      timestamp = now;
      isGhost = isGhost;
      ghostDeleteAt = ghostDeleteAt;
    };
    messages.add(messageIdCounter, msg);
    let id = messageIdCounter;
    messageIdCounter += 1;
    id;
  };

  public query ({ caller }) func getConversation(otherAnonId : Text) : async [Message] {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
    let now = Time.now();
    let myId = callerUser.anonymousId;
    let all = messages.values().toArray();
    all.filter(
      func(m : Message) : Bool {
        let isConvo = (m.senderId == myId and m.receiverId == otherAnonId) or
                      (m.senderId == otherAnonId and m.receiverId == myId);
        if (not isConvo) return false;
        switch (m.ghostDeleteAt) {
          case (?deadline) { now < deadline };
          case (null) { true };
        };
      }
    );
  };

  public shared ({ caller }) func deleteMessage(msgId : Nat) : async () {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
    switch (messages.get(msgId)) {
      case (null) { Runtime.trap("Message not found") };
      case (?msg) {
        if (msg.senderId != callerUser.anonymousId) {
          Runtime.trap("Cannot delete others messages");
        };
        messages.remove(msgId);
      };
    };
  };

  public shared ({ caller }) func blockUser(anonId : Text) : async () {
    switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?_) {
        let current = switch (blockedUsers.get(caller)) {
          case (null) { [] };
          case (?list) { list };
        };
        if (not textArrayContains(current, anonId)) {
          let newList = Array.tabulate(current.size() + 1, func(i : Nat) : Text { if (i < current.size()) { current[i] } else { anonId } });
          blockedUsers.add(caller, newList);
        };
      };
    };
  };

  public shared ({ caller }) func unblockUser(anonId : Text) : async () {
    switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?_) {
        let current = switch (blockedUsers.get(caller)) {
          case (null) { [] };
          case (?list) { list };
        };
        blockedUsers.add(caller, current.filter(func(id : Text) : Bool { id != anonId }));
      };
    };
  };

  public query ({ caller }) func getBlockedUsers() : async [Text] {
    switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?_) {
        switch (blockedUsers.get(caller)) {
          case (null) { [] };
          case (?list) { list };
        };
      };
    };
  };

  public shared ({ caller }) func reportUser(anonId : Text, reason : Text) : async () {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
    reports.add(reportIdCounter, (callerUser.anonymousId, anonId, reason));
    reportIdCounter += 1;
  };

  // =====================
  // RANDOM MATCHING SYSTEM
  // =====================

  public shared ({ caller }) func joinMatchQueue() : async MatchStatus {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };

    switch (principalToSession.get(caller)) {
      case (?sid) {
        switch (randomSessions.get(sid)) {
          case (?session) {
            if (session.isActive) {
              let partner = if (session.user1AnonId == callerUser.anonymousId) session.user2AnonId else session.user1AnonId;
              return #Matched { sessionId = sid; partnerAnonId = partner };
            };
          };
          case (null) {};
        };
      };
      case (null) {};
    };

    let now = Time.now();
    let staleKeys = matchQueue.entries().filter(
      func((p, joinedAt) : (Principal, Int)) : Bool {
        now - joinedAt > MATCH_TIMEOUT_NS;
      }
    ).map(func((p, _) : (Principal, Int)) : Principal { p }).toArray();
    for (p in staleKeys.vals()) {
      matchQueue.remove(p);
    };

    var foundMatch : ?Principal = null;
    label search for ((qp, _) in matchQueue.entries()) {
      if (qp != caller) {
        foundMatch := ?qp;
        break search;
      };
    };

    switch (foundMatch) {
      case (?partner) {
        matchQueue.remove(partner);
        matchQueue.remove(caller);
        principalToSession.remove(caller);
        principalToSession.remove(partner);
        let partnerUser = switch (users.get(partner)) {
          case (null) { Runtime.trap("Partner not found") };
          case (?u) { u };
        };
        let sid = sessionIdCounter;
        sessionIdCounter += 1;
        let session : RandomSession = {
          id = sid;
          user1AnonId = callerUser.anonymousId;
          user2AnonId = partnerUser.anonymousId;
          startedAt = now;
          isActive = true;
        };
        randomSessions.add(sid, session);
        principalToSession.add(caller, sid);
        principalToSession.add(partner, sid);
        #Matched { sessionId = sid; partnerAnonId = partnerUser.anonymousId };
      };
      case (null) {
        matchQueue.add(caller, now);
        #Waiting { joinedAt = now };
      };
    };
  };

  public shared ({ caller }) func checkMatchStatus() : async MatchStatus {
    let callerUser = switch (users.get(caller)) {
      case (null) { return #NotInQueue };
      case (?u) { u };
    };

    switch (principalToSession.get(caller)) {
      case (?sid) {
        switch (randomSessions.get(sid)) {
          case (?session) {
            if (session.isActive) {
              let partner = if (session.user1AnonId == callerUser.anonymousId) session.user2AnonId else session.user1AnonId;
              return #Matched { sessionId = sid; partnerAnonId = partner };
            };
          };
          case (null) {};
        };
      };
      case (null) {};
    };

    switch (matchQueue.get(caller)) {
      case (?joinedAt) {
        let now = Time.now();
        if (now - joinedAt > MATCH_TIMEOUT_NS) {
          #TimedOut;
        } else {
          #Waiting { joinedAt };
        };
      };
      case (null) { #NotInQueue };
    };
  };

  public shared ({ caller }) func leaveMatchQueue() : async () {
    matchQueue.remove(caller);
  };

  public shared ({ caller }) func sendRandomMessage(sessionId : Nat, content : Text) : async Nat {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
    let session = switch (randomSessions.get(sessionId)) {
      case (null) { Runtime.trap("Session not found") };
      case (?s) { s };
    };
    if (not session.isActive) { Runtime.trap("Session ended") };
    let isParticipant = session.user1AnonId == callerUser.anonymousId or session.user2AnonId == callerUser.anonymousId;
    if (not isParticipant) { Runtime.trap("Not in this session") };
    let msg : RandomMessage = {
      id = randomMsgIdCounter;
      sessionId = sessionId;
      senderAnonId = callerUser.anonymousId;
      content = content;
      timestamp = Time.now();
    };
    randomMessages.add(randomMsgIdCounter, msg);
    let id = randomMsgIdCounter;
    randomMsgIdCounter += 1;
    id;
  };

  public query ({ caller }) func getRandomMessages(sessionId : Nat) : async [RandomMessage] {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
    let session = switch (randomSessions.get(sessionId)) {
      case (null) { Runtime.trap("Session not found") };
      case (?s) { s };
    };
    let isParticipant = session.user1AnonId == callerUser.anonymousId or session.user2AnonId == callerUser.anonymousId;
    if (not isParticipant) { Runtime.trap("Not in this session") };
    randomMessages.values().filter(
      func(m : RandomMessage) : Bool { m.sessionId == sessionId }
    ).toArray();
  };

  public shared ({ caller }) func sendRandomVoiceMessage(sessionId : Nat, audioHash : Text, duration : Nat) : async Nat {
    if (duration > 60) { Runtime.trap("Max 60 seconds") };
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
    let session = switch (randomSessions.get(sessionId)) {
      case (null) { Runtime.trap("Session not found") };
      case (?s) { s };
    };
    if (not session.isActive) { Runtime.trap("Session ended") };
    let isParticipant = session.user1AnonId == callerUser.anonymousId or session.user2AnonId == callerUser.anonymousId;
    if (not isParticipant) { Runtime.trap("Not in this session") };
    let msg : RandomVoiceMessage = {
      id = randomVoiceMsgIdCounter;
      sessionId = sessionId;
      senderAnonId = callerUser.anonymousId;
      audioHash = audioHash;
      duration = duration;
      timestamp = Time.now();
    };
    randomVoiceMessages.add(randomVoiceMsgIdCounter, msg);
    let id = randomVoiceMsgIdCounter;
    randomVoiceMsgIdCounter += 1;
    id;
  };

  public query ({ caller }) func getRandomVoiceMessages(sessionId : Nat) : async [RandomVoiceMessage] {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
    let session = switch (randomSessions.get(sessionId)) {
      case (null) { Runtime.trap("Session not found") };
      case (?s) { s };
    };
    let isParticipant = session.user1AnonId == callerUser.anonymousId or session.user2AnonId == callerUser.anonymousId;
    if (not isParticipant) { Runtime.trap("Not in this session") };
    randomVoiceMessages.values().filter(
      func(m : RandomVoiceMessage) : Bool { m.sessionId == sessionId }
    ).toArray();
  };

  public shared ({ caller }) func endRandomSession(sessionId : Nat) : async () {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
    let session = switch (randomSessions.get(sessionId)) {
      case (null) { Runtime.trap("Session not found") };
      case (?s) { s };
    };
    let isParticipant = session.user1AnonId == callerUser.anonymousId or session.user2AnonId == callerUser.anonymousId;
    if (not isParticipant) { Runtime.trap("Not in this session") };
    randomSessions.add(sessionId, { session with isActive = false });
    switch (anonIdToPrincipal.get(session.user1AnonId)) {
      case (?p) { principalToSession.remove(p) };
      case (null) {};
    };
    switch (anonIdToPrincipal.get(session.user2AnonId)) {
      case (?p) { principalToSession.remove(p) };
      case (null) {};
    };
  };

  public query ({ caller }) func getCurrentSession() : async ?RandomSession {
    switch (principalToSession.get(caller)) {
      case (null) { null };
      case (?sid) { randomSessions.get(sid) };
    };
  };

  public shared ({ caller }) func sendVoiceMessage(receiverAnonId : Text, audioHash : Text, duration : Nat) : async Nat {
    if (duration > 60) {
      Runtime.trap("Voice message duration must be 60 seconds or less");
    };
    let sender = switch (users.get(caller)) {
      case (null) { Runtime.trap("Sender must be registered") };
      case (?user) { user };
    };
    let receiverPrincipal = switch (anonIdToPrincipal.get(receiverAnonId)) {
      case (null) { Runtime.trap("Receiver not found") };
      case (?p) { p };
    };
    if (isBlocked(receiverPrincipal, sender.anonymousId)) {
      Runtime.trap("You are blocked by this user");
    };
    let messageId = voiceMessageIdCounter;
    voiceMessageIdCounter += 1;
    let newVoiceMessage : VoiceMessage = {
      id = messageId;
      senderId = sender.anonymousId;
      receiverId = receiverAnonId;
      audioHash = audioHash;
      duration = duration;
      timestamp = Time.now();
    };
    voiceMessages.add(messageId, newVoiceMessage);
    messageId;
  };

  public query ({ caller }) func getVoiceMessages(otherAnonId : Text) : async [VoiceMessage] {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
    let myId = callerUser.anonymousId;
    let filtered = voiceMessages.values().filter(
      func(vm : VoiceMessage) : Bool {
        (vm.senderId == myId and vm.receiverId == otherAnonId) or
        (vm.senderId == otherAnonId and vm.receiverId == myId)
      }
    );
    let sorted = filtered.toArray().sort(
      func(a : VoiceMessage, b : VoiceMessage) : { #less; #equal; #greater } {
        Int.compare(a.timestamp, b.timestamp)
      }
    );
    sorted;
  };

  // =====================
  // P2P TRADING SYSTEM
  // =====================

  // Internal helper: cancel expired Pending trades and unlock their listings
  func cancelExpiredTradesInternal() : Nat {
    let now = Time.now();
    var cancelCount = 0;
    for ((tid, trade) in p2pTrades.entries()) {
      switch (trade.status) {
        case (#Pending) {
          if (now - trade.createdAt > P2P_TRADE_TIMEOUT_NS) {
            p2pTrades.add(tid, { trade with status = #Cancelled });
            // Unlock the listing back to Active
            switch (p2pListings.get(trade.listingId)) {
              case (?listing) {
                switch (listing.status) {
                  case (#Locked) {
                    p2pListings.add(trade.listingId, { listing with status = #Active });
                  };
                  case (_) {};
                };
              };
              case (null) {};
            };
            cancelCount += 1;
          };
        };
        case (_) {};
      };
    };
    cancelCount;
  };

  // Create a listing: seller lists their current anonymousId for sale
  public shared ({ caller }) func createListing(price : Text, iban : Text) : async P2PListing {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
    // Check if seller already has an Active or Locked listing
    for ((_, listing) in p2pListings.entries()) {
      if (listing.sellerPrincipal == caller) {
        switch (listing.status) {
          case (#Active or #Locked) {
            Runtime.trap("You already have an active listing. Cancel it first.");
          };
          case (_) {};
        };
      };
    };
    if (price == "") { Runtime.trap("Price cannot be empty") };
    if (iban == "") { Runtime.trap("IBAN cannot be empty") };
    let listingId = listingIdCounter;
    listingIdCounter += 1;
    let newListing : P2PListing = {
      id = listingId;
      sellerPrincipal = caller;
      sellerAnonId = callerUser.anonymousId;
      listedAnonId = callerUser.anonymousId;
      price = price;
      iban = iban;
      status = #Active;
      createdAt = Time.now();
    };
    p2pListings.add(listingId, newListing);
    newListing;
  };

  // Get all active listings
  public query func getActiveListings() : async [P2PListing] {
    p2pListings.values().filter(
      func(l : P2PListing) : Bool {
        switch (l.status) {
          case (#Active) { true };
          case (_) { false };
        };
      }
    ).toArray();
  };

  // Get caller's listings
  public query ({ caller }) func getMyListings() : async [P2PListing] {
    p2pListings.values().filter(
      func(l : P2PListing) : Bool { l.sellerPrincipal == caller }
    ).toArray();
  };

  // Cancel an active listing
  public shared ({ caller }) func cancelListing(listingId : Nat) : async () {
    let listing = switch (p2pListings.get(listingId)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?l) { l };
    };
    if (listing.sellerPrincipal != caller) {
      Runtime.trap("Only the seller can cancel this listing");
    };
    switch (listing.status) {
      case (#Active) {
        p2pListings.add(listingId, { listing with status = #Cancelled });
      };
      case (_) {
        Runtime.trap("Can only cancel Active listings");
      };
    };
  };

  // Buyer initiates a trade
  public shared ({ caller }) func buyListing(listingId : Nat) : async P2PTrade {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
    // Auto-cancel expired trades first
    ignore cancelExpiredTradesInternal();

    let listing = switch (p2pListings.get(listingId)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?l) { l };
    };
    if (listing.sellerPrincipal == caller) {
      Runtime.trap("Cannot buy your own listing");
    };
    switch (listing.status) {
      case (#Active) {};
      case (#Locked) { Runtime.trap("This ID is already being purchased by someone else") };
      case (#Sold) { Runtime.trap("This ID has already been sold") };
      case (#Cancelled) { Runtime.trap("This listing has been cancelled") };
    };
    // Lock the listing
    p2pListings.add(listingId, { listing with status = #Locked });
    // Create the trade
    let tradeId = tradeIdCounter;
    tradeIdCounter += 1;
    let newTrade : P2PTrade = {
      id = tradeId;
      listingId = listingId;
      buyerPrincipal = caller;
      buyerAnonId = callerUser.anonymousId;
      sellerPrincipal = listing.sellerPrincipal;
      sellerAnonId = listing.sellerAnonId;
      listedAnonId = listing.listedAnonId;
      price = listing.price;
      iban = listing.iban;
      status = #Pending;
      proofScreenshotHash = null;
      referenceNumber = null;
      createdAt = Time.now();
      paymentSentAt = null;
    };
    p2pTrades.add(tradeId, newTrade);
    newTrade;
  };

  // Buyer marks payment as sent
  public shared ({ caller }) func markPaymentSent(tradeId : Nat, referenceNumber : Text, screenshotHash : Text) : async () {
    let trade = switch (p2pTrades.get(tradeId)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?t) { t };
    };
    if (trade.buyerPrincipal != caller) {
      Runtime.trap("Only the buyer can mark payment as sent");
    };
    switch (trade.status) {
      case (#Pending) {};
      case (_) { Runtime.trap("Trade is not in Pending status") };
    };
    // Check 15-minute expiry
    let now = Time.now();
    if (now - trade.createdAt > P2P_TRADE_TIMEOUT_NS) {
      p2pTrades.add(tradeId, { trade with status = #Cancelled });
      // Unlock listing
      switch (p2pListings.get(trade.listingId)) {
        case (?listing) {
          switch (listing.status) {
            case (#Locked) { p2pListings.add(trade.listingId, { listing with status = #Active }) };
            case (_) {};
          };
        };
        case (null) {};
      };
      Runtime.trap("Trade expired. Please start a new purchase.");
    };
    p2pTrades.add(tradeId, {
      trade with
      status = #PaymentSent;
      referenceNumber = ?referenceNumber;
      proofScreenshotHash = ?screenshotHash;
      paymentSentAt = ?now;
    });
  };

  // Seller confirms the trade — transfers ID to buyer, seller gets new ID
  public shared ({ caller }) func confirmTrade(tradeId : Nat) : async () {
    let trade = switch (p2pTrades.get(tradeId)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?t) { t };
    };
    if (trade.sellerPrincipal != caller) {
      Runtime.trap("Only the seller can confirm this trade");
    };
    switch (trade.status) {
      case (#PaymentSent) {};
      case (_) { Runtime.trap("Trade is not in PaymentSent status") };
    };
    // Transfer ID: buyer gets listedAnonId
    let buyerUser = switch (users.get(trade.buyerPrincipal)) {
      case (null) { Runtime.trap("Buyer not found") };
      case (?u) { u };
    };
    let sellerUser = switch (users.get(trade.sellerPrincipal)) {
      case (null) { Runtime.trap("Seller not found") };
      case (?u) { u };
    };
    // Remove buyer's old anonId from maps
    anonIdToPrincipal.remove(buyerUser.anonymousId);
    usedIds.remove(buyerUser.anonymousId);
    // Assign listed ID to buyer
    let newBuyerUser = { buyerUser with anonymousId = trade.listedAnonId };
    users.add(trade.buyerPrincipal, newBuyerUser);
    anonIdToPrincipal.add(trade.listedAnonId, trade.buyerPrincipal);
    switch (userProfiles.get(trade.buyerPrincipal)) {
      case (?p) { userProfiles.add(trade.buyerPrincipal, { p with anonymousId = trade.listedAnonId }) };
      case (null) {};
    };
    // Seller's old ID is now the buyer's — generate new ID for seller
    // (The seller's anonId is already removed via the transfer since listedAnonId == sellerAnonId)
    // We only need to generate a new ID for the seller
    // Note: generateUniqueId is async, we handle it below
    // Mark trade and listing as completed synchronously
    p2pTrades.add(tradeId, { trade with status = #Confirmed });
    switch (p2pListings.get(trade.listingId)) {
      case (?listing) { p2pListings.add(trade.listingId, { listing with status = #Sold }) };
      case (null) {};
    };
    // Generate and assign new ID for seller asynchronously
    let newSellerAnonId = await generateUniqueId();
    usedIds.add(newSellerAnonId, ());
    let newSellerUser = { sellerUser with anonymousId = newSellerAnonId };
    users.add(trade.sellerPrincipal, newSellerUser);
    anonIdToPrincipal.add(newSellerAnonId, trade.sellerPrincipal);
    switch (userProfiles.get(trade.sellerPrincipal)) {
      case (?p) { userProfiles.add(trade.sellerPrincipal, { p with anonymousId = newSellerAnonId }) };
      case (null) {};
    };
  };

  // Seller rejects the trade (dispute)
  public shared ({ caller }) func rejectTrade(tradeId : Nat) : async () {
    let trade = switch (p2pTrades.get(tradeId)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?t) { t };
    };
    if (trade.sellerPrincipal != caller) {
      Runtime.trap("Only the seller can reject this trade");
    };
    switch (trade.status) {
      case (#PaymentSent) {};
      case (#Pending) {};
      case (_) { Runtime.trap("Trade cannot be rejected in its current status") };
    };
    p2pTrades.add(tradeId, { trade with status = #Disputed });
    // Unlock listing back to Active
    switch (p2pListings.get(trade.listingId)) {
      case (?listing) {
        switch (listing.status) {
          case (#Locked) { p2pListings.add(trade.listingId, { listing with status = #Active }) };
          case (_) {};
        };
      };
      case (null) {};
    };
  };

  // Get all trades where caller is buyer or seller
  public query ({ caller }) func getMyTrades() : async [P2PTrade] {
    p2pTrades.values().filter(
      func(t : P2PTrade) : Bool {
        t.buyerPrincipal == caller or t.sellerPrincipal == caller
      }
    ).toArray();
  };

  // Get a specific trade
  public query ({ caller }) func getTrade(tradeId : Nat) : async ?P2PTrade {
    switch (p2pTrades.get(tradeId)) {
      case (null) { null };
      case (?trade) {
        if (trade.buyerPrincipal != caller and trade.sellerPrincipal != caller) {
          Runtime.trap("Unauthorized: Not your trade");
        };
        ?trade;
      };
    };
  };

  // Public: cancel expired trades (callable by anyone)
  public shared func cancelExpiredTrades() : async Nat {
    cancelExpiredTradesInternal();
  };

  // Cancel a Pending trade manually (buyer only, or auto-expire)
  public shared ({ caller }) func cancelTrade(tradeId : Nat) : async () {
    let trade = switch (p2pTrades.get(tradeId)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?t) { t };
    };
    if (trade.buyerPrincipal != caller and trade.sellerPrincipal != caller) {
      Runtime.trap("Unauthorized: Not your trade");
    };
    switch (trade.status) {
      case (#Pending) {};
      case (_) { Runtime.trap("Can only cancel Pending trades") };
    };
    p2pTrades.add(tradeId, { trade with status = #Cancelled });
    switch (p2pListings.get(trade.listingId)) {
      case (?listing) {
        switch (listing.status) {
          case (#Locked) { p2pListings.add(trade.listingId, { listing with status = #Active }) };
          case (_) {};
        };
      };
      case (null) {};
    };
  };
};
