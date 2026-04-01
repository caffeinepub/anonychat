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


  // =====================
  // P2P TRADE REVIEW & CHAT TYPES
  // =====================

  public type TradeReview = {
    id : Nat;
    tradeId : Nat;
    reviewerPrincipal : Principal;
    targetPrincipal : Principal;
    targetAnonId : Text;
    stars : Nat;
    comment : Text;
    createdAt : Int;
  };

  public type TradeMessage = {
    id : Nat;
    tradeId : Nat;
    senderPrincipal : Principal;
    senderAnonId : Text;
    content : Text;
    createdAt : Int;
  };

  public type SellerStats = {
    averageRating : Nat;
    totalReviews : Nat;
    completedTrades : Nat;
  };

  // =====================
  // ANONCASH REFERRAL TYPES
  // =====================

  public type RewardLevel = { #Level1; #Level2; #Level3 };

  public type RewardStatus = { #Pending; #Claimable; #Claimed };

  public type PendingReward = {
    id : Nat;
    level : RewardLevel;
    amount : Nat;
    referredUserAnonId : Text;
    createdAt : Int;
    claimableAt : Int;
    status : RewardStatus;
  };

  public type ReferralStats = {
    referralCode : ?Text;
    totalReferrals : Nat;
    qualifiedReferrals : Nat;
    anonCashBalance : Nat;
    pendingAmount : Nat;
    level1Count : Nat;
    level2Unlocked : Bool;
    level3Count : Nat;
  };

  // =====================
  // STABLE STATE (persists across upgrades)
  // =====================
  stable var userIdCounter = 0;
  stable var messageIdCounter = 0;
  stable let users = Map.empty<Principal, User>();
  stable let usedIds = Map.empty<Text, ()>();
  stable let userProfiles = Map.empty<Principal, UserProfile>();
  stable let userLocations = Map.empty<Principal, (Float, Float)>();
  stable let anonIdToPrincipal = Map.empty<Text, Principal>();
  stable let messages = Map.empty<Nat, Message>();
  stable let voiceMessages = Map.empty<Nat, VoiceMessage>();
  stable let blockedUsers = Map.empty<Principal, [Text]>();
  stable let reports = Map.empty<Nat, (Text, Text, Text)>();
  stable var reportIdCounter = 0;

  // --- Random Matching ---
  stable let matchQueue = Map.empty<Principal, Int>();
  stable var voiceMessageIdCounter = 0;
  stable var sessionIdCounter = 0;
  stable let randomSessions = Map.empty<Nat, RandomSession>();
  stable let principalToSession = Map.empty<Principal, Nat>();
  stable var randomMsgIdCounter = 0;
  stable let randomMessages = Map.empty<Nat, RandomMessage>();
  stable var randomVoiceMsgIdCounter = 0;
  stable let randomVoiceMessages = Map.empty<Nat, RandomVoiceMessage>();

  // --- P2P Trading ---
  stable let p2pListings = Map.empty<Nat, P2PListing>();
  stable let p2pTrades = Map.empty<Nat, P2PTrade>();
  stable var listingIdCounter = 0;
  stable var tradeIdCounter = 0;

  // --- Trade Reviews & Chat ---
  stable let tradeReviews = Map.empty<Nat, TradeReview>();
  stable var reviewIdCounter = 0;
  stable let tradeMessages = Map.empty<Nat, TradeMessage>();
  stable var tradeMessageIdCounter = 0;

  // --- AnonCash Referral System ---
  stable let referralCodes = Map.empty<Text, Principal>();
  stable let principalToReferralCode = Map.empty<Principal, Text>();
  stable let referredBy = Map.empty<Principal, Principal>();
  stable let userReferrals = Map.empty<Principal, [Principal]>();
  stable let anonCashBalance = Map.empty<Principal, Nat>();
  stable let pendingRewardMap = Map.empty<Nat, PendingReward>();
  stable let userPendingRewardIds = Map.empty<Principal, [Nat]>();
  stable var rewardIdCounter = 0;
  stable let userMsgCount = Map.empty<Principal, Nat>();
  stable let level1Issued = Map.empty<Principal, [Principal]>();
  stable let level2Issued = Map.empty<Principal, Bool>();
  stable let level3Issued = Map.empty<Principal, [Principal]>();
  stable let dailyEarnings = Map.empty<Principal, (Int, Nat)>();

  let MATCH_TIMEOUT_NS : Int = 30_000_000_000;
  let P2P_TRADE_TIMEOUT_NS : Int = 900_000_000_000; // 15 minutes
  let REWARD_DELAY_NS : Int = 86_400_000_000_000;   // 24 hours
  let DAILY_EARN_CAP : Nat = 100;
  let ACTIVE_MSG_THRESHOLD : Nat = 5;
  // --- Admin & Commission System ---
  stable let frozenUsers = Map.empty<Principal, Bool>();
  stable let tradeCommissions = Map.empty<Nat, Nat>();
  stable var systemCommissionBalance : Nat = 0;
  stable let disputeEvidence = Map.empty<Nat, Text>();
  let COMMISSION_RATE_BPS : Nat = 200; // 2% in basis points

  // --- ID Slot System ---
  stable let userOwnedIds = Map.empty<Principal, [Text]>();
  stable let idLastActivity = Map.empty<Text, Int>();
  stable let userPremiumSlots = Map.empty<Principal, Bool>();
  let ID_SLOT_BASE : Nat = 3;
  let ID_SLOT_HARD_CAP : Nat = 10;
  let ID_SLOT_PREMIUM_BONUS : Nat = 5;
  let ID_INACTIVE_NS : Int = 2_592_000_000_000_000; // 30 days



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

  // FIX: Atomically reserve ID in usedIds before returning to prevent race conditions
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
    // Reserve atomically: mark as used before returning (no await after this)
    usedIds.add(id, ());
    id;
  };

  // --- Referral helpers ---

  func appendPrincipalArr(arr : [Principal], p : Principal) : [Principal] {
    Array.tabulate(arr.size() + 1, func(i : Nat) : Principal {
      if (i < arr.size()) { arr[i] } else { p }
    });
  };

  func appendNatArr(arr : [Nat], n : Nat) : [Nat] {
    Array.tabulate(arr.size() + 1, func(i : Nat) : Nat {
      if (i < arr.size()) { arr[i] } else { n }
    });
  };

  func addPendingRewardToUser(referrer : Principal, reward : PendingReward) : () {
    pendingRewardMap.add(reward.id, reward);
    let existing = switch (userPendingRewardIds.get(referrer)) {
      case (null) { [] };
      case (?arr) { arr };
    };
    userPendingRewardIds.add(referrer, appendNatArr(existing, reward.id));
  };

  func checkAndIssueReferralReward(activeUser : Principal) : () {
    switch (users.get(activeUser)) {
      case (null) { };
      case (?activeUserData) {
        switch (referredBy.get(activeUser)) {
          case (null) { };
          case (?referrer) {
            let l1List = switch (level1Issued.get(referrer)) {
              case (null) { [] };
              case (?arr) { arr };
            };
            let alreadyL1 = switch (l1List.find(func(p : Principal) : Bool { p == activeUser })) {
              case (?_) { true };
              case (null) { false };
            };
            if (not alreadyL1) {
              let now = Time.now();
              let rewardId = rewardIdCounter;
              rewardIdCounter += 1;
              let reward : PendingReward = {
                id = rewardId;
                level = #Level1;
                amount = 1;
                referredUserAnonId = activeUserData.anonymousId;
                createdAt = now;
                claimableAt = now + REWARD_DELAY_NS;
                status = #Pending;
              };
              addPendingRewardToUser(referrer, reward);
              level1Issued.add(referrer, appendPrincipalArr(l1List, activeUser));
              let newL1Count = switch (level1Issued.get(referrer)) {
                case (null) { 0 };
                case (?arr) { arr.size() };
              };
              let l2Done = switch (level2Issued.get(referrer)) {
                case (null) { false };
                case (?b) { b };
              };
              if (newL1Count >= 5 and not l2Done) {
                let l2Id = rewardIdCounter;
                rewardIdCounter += 1;
                let l2Reward : PendingReward = {
                  id = l2Id;
                  level = #Level2;
                  amount = 10;
                  referredUserAnonId = activeUserData.anonymousId;
                  createdAt = now;
                  claimableAt = now + REWARD_DELAY_NS;
                  status = #Pending;
                };
                addPendingRewardToUser(referrer, l2Reward);
                level2Issued.add(referrer, true);
              };
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func register() : async User {
    if (users.containsKey(caller)) {
      switch (users.get(caller)) {
        case (null) { Runtime.trap("Inconsistent state") };
        case (?user) { return user };
      };
    };
    // generateUniqueId now atomically adds to usedIds, so no duplicate add needed
    let anonymousId = await generateUniqueId();
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
    // Initialize ID slot ownership
    userOwnedIds.add(caller, [anonymousId]);
    idLastActivity.add(anonymousId, Time.now());
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
    // Track message count for referral activity detection
    let msgCount = switch (userMsgCount.get(caller)) {
      case (null) { 1 };
      case (?c) { c + 1 };
    };
    userMsgCount.add(caller, msgCount);
    if (msgCount == ACTIVE_MSG_THRESHOLD) {
      checkAndIssueReferralReward(caller);
    };
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

  // FIX: Changed to query call for near-instant response (~150ms vs ~2s)
  public query ({ caller }) func checkMatchStatus() : async MatchStatus {
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

  // FIX: Also clean principalToSession to prevent stale session references
  public shared ({ caller }) func leaveMatchQueue() : async () {
    matchQueue.remove(caller);
    // Clean stale session mapping if the session is no longer active
    switch (principalToSession.get(caller)) {
      case (?sid) {
        switch (randomSessions.get(sid)) {
          case (?session) {
            if (not session.isActive) {
              principalToSession.remove(caller);
            };
          };
          case (null) {
            principalToSession.remove(caller);
          };
        };
      };
      case (null) {};
    };
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

  func cancelExpiredTradesInternal() : Nat {
    let now = Time.now();
    var cancelCount = 0;
    for ((tid, trade) in p2pTrades.entries()) {
      switch (trade.status) {
        case (#Pending) {
          if (now - trade.createdAt > P2P_TRADE_TIMEOUT_NS) {
            p2pTrades.add(tid, { trade with status = #Cancelled });
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

  public shared ({ caller }) func createListing(price : Text, iban : Text) : async P2PListing {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
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

  public query ({ caller }) func getMyListings() : async [P2PListing] {
    p2pListings.values().filter(
      func(l : P2PListing) : Bool { l.sellerPrincipal == caller }
    ).toArray();
  };

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

  public shared ({ caller }) func buyListing(listingId : Nat) : async P2PTrade {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
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
    p2pListings.add(listingId, { listing with status = #Locked });
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
    let now = Time.now();
    if (now - trade.createdAt > P2P_TRADE_TIMEOUT_NS) {
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
    let buyerUser = switch (users.get(trade.buyerPrincipal)) {
      case (null) { Runtime.trap("Buyer not found") };
      case (?u) { u };
    };
    let sellerUser = switch (users.get(trade.sellerPrincipal)) {
      case (null) { Runtime.trap("Seller not found") };
      case (?u) { u };
    };
    // Transfer ID to buyer: remove buyer's old ID mapping first
    anonIdToPrincipal.remove(buyerUser.anonymousId);
    // Note: we keep buyerUser.anonymousId in usedIds so it won't be reassigned
    let newBuyerUser = { buyerUser with anonymousId = trade.listedAnonId };
    users.add(trade.buyerPrincipal, newBuyerUser);
    anonIdToPrincipal.add(trade.listedAnonId, trade.buyerPrincipal);
    switch (userProfiles.get(trade.buyerPrincipal)) {
      case (?p) { userProfiles.add(trade.buyerPrincipal, { p with anonymousId = trade.listedAnonId }) };
      case (null) {};
    };
    p2pTrades.add(tradeId, { trade with status = #Confirmed });
    switch (p2pListings.get(trade.listingId)) {
      case (?listing) { p2pListings.add(trade.listingId, { listing with status = #Sold }) };
      case (null) {};
    };
    // Give seller a new random ID
    let newSellerAnonId = await generateUniqueId();
    let newSellerUser = { sellerUser with anonymousId = newSellerAnonId };
    anonIdToPrincipal.remove(sellerUser.anonymousId);
    users.add(trade.sellerPrincipal, newSellerUser);
    anonIdToPrincipal.add(newSellerAnonId, trade.sellerPrincipal);
    switch (userProfiles.get(trade.sellerPrincipal)) {
      case (?p) { userProfiles.add(trade.sellerPrincipal, { p with anonymousId = newSellerAnonId }) };
      case (null) {};
    };
  };

  // FIX: rejectTrade now correctly sets #Rejected status (not #Disputed)
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
    // FIX: Use #Rejected instead of #Disputed for clean seller rejection
    p2pTrades.add(tradeId, { trade with status = #Rejected });
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

  public query ({ caller }) func getMyTrades() : async [P2PTrade] {
    p2pTrades.values().filter(
      func(t : P2PTrade) : Bool {
        t.buyerPrincipal == caller or t.sellerPrincipal == caller
      }
    ).toArray();
  };

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

  public shared func cancelExpiredTrades() : async Nat {
    cancelExpiredTradesInternal();
  };

  // FIX: Allow buyer to cancel even after PaymentSent (seller protection: only if no proof submitted)
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
      case (#PaymentSent) {
        // Only buyer can cancel a PaymentSent trade (e.g., if they sent wrong reference)
        // Seller should use rejectTrade instead
        if (trade.buyerPrincipal != caller) {
          Runtime.trap("Seller must use Reject for PaymentSent trades");
        };
      };
      case (_) { Runtime.trap("Cannot cancel trade in its current status") };
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

  // =====================
  // ANONCASH REFERRAL SYSTEM
  // =====================

  // Get or create the referral code for the caller (= their anonymousId)
  public shared ({ caller }) func generateReferralCode() : async Text {
    switch (principalToReferralCode.get(caller)) {
      case (?code) { return code };
      case (null) {};
    };
    let user = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
    let code = user.anonymousId;
    referralCodes.add(code, caller);
    principalToReferralCode.add(caller, code);
    code;
  };

  public query ({ caller }) func getReferralCode() : async ?Text {
    principalToReferralCode.get(caller);
  };

  // New user enters someone else's referral code
  public shared ({ caller }) func useReferralCode(code : Text) : async () {
    if (referredBy.containsKey(caller)) {
      Runtime.trap("You already used a referral code");
    };
    switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?_) {};
    };
    let referrer = switch (referralCodes.get(code)) {
      case (null) { Runtime.trap("Invalid referral code") };
      case (?p) { p };
    };
    if (referrer == caller) {
      Runtime.trap("Cannot use your own referral code");
    };
    referredBy.add(caller, referrer);
    let current = switch (userReferrals.get(referrer)) {
      case (null) { [] };
      case (?arr) { arr };
    };
    userReferrals.add(referrer, appendPrincipalArr(current, caller));
  };

  // Mark caller as premium (simplified — for L3 reward trigger)
  public shared ({ caller }) func buyPremium() : async () {
    let callerUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("Must register first") };
      case (?u) { u };
    };
    switch (referredBy.get(caller)) {
      case (null) { };
      case (?referrer) {
        let l3List = switch (level3Issued.get(referrer)) {
          case (null) { [] };
          case (?arr) { arr };
        };
        let alreadyL3 = switch (l3List.find(func(p : Principal) : Bool { p == caller })) {
          case (?_) { true };
          case (null) { false };
        };
        if (not alreadyL3) {
          let now = Time.now();
          let rewardId = rewardIdCounter;
          rewardIdCounter += 1;
          let reward : PendingReward = {
            id = rewardId;
            level = #Level3;
            amount = 50;
            referredUserAnonId = callerUser.anonymousId;
            createdAt = now;
            claimableAt = now + REWARD_DELAY_NS;
            status = #Pending;
          };
          addPendingRewardToUser(referrer, reward);
          level3Issued.add(referrer, appendPrincipalArr(l3List, caller));
        };
      };
    };
  };

  public query ({ caller }) func getAnonCashBalance() : async Nat {
    switch (anonCashBalance.get(caller)) {
      case (null) { 0 };
      case (?b) { b };
    };
  };

  public query ({ caller }) func getPendingRewards() : async [PendingReward] {
    let ids = switch (userPendingRewardIds.get(caller)) {
      case (null) { return [] };
      case (?arr) { arr };
    };
    let now = Time.now();
    let active = ids.filter(func(id : Nat) : Bool {
      switch (pendingRewardMap.get(id)) {
        case (null) { false };
        case (?r) {
          switch (r.status) {
            case (#Claimed) { false };
            case (_) { true };
          };
        };
      };
    });
    Array.tabulate(active.size(), func(i : Nat) : PendingReward {
      let id = active[i];
      let reward = switch (pendingRewardMap.get(id)) {
        case (null) { Runtime.trap("Inconsistent state") };
        case (?r) { r };
      };
      let newStatus : RewardStatus = if (now >= reward.claimableAt) { #Claimable } else { #Pending };
      { reward with status = newStatus };
    });
  };

  public shared ({ caller }) func claimReward(rewardId : Nat) : async Nat {
    let reward = switch (pendingRewardMap.get(rewardId)) {
      case (null) { Runtime.trap("Reward not found") };
      case (?r) { r };
    };
    let ids = switch (userPendingRewardIds.get(caller)) {
      case (null) { Runtime.trap("Not your reward") };
      case (?arr) { arr };
    };
    let owns = switch (ids.find(func(id : Nat) : Bool { id == rewardId })) {
      case (?_) { true };
      case (null) { false };
    };
    if (not owns) { Runtime.trap("Not your reward") };
    switch (reward.status) {
      case (#Claimed) { Runtime.trap("Already claimed") };
      case (_) {};
    };
    let now = Time.now();
    if (now < reward.claimableAt) {
      Runtime.trap("Reward not yet claimable. Please wait 24 hours.");
    };
    let (windowStart, windowEarned) = switch (dailyEarnings.get(caller)) {
      case (null) { (now, 0) };
      case (?w) { w };
    };
    let (currentStart, currentEarned) = if (now - windowStart > REWARD_DELAY_NS) {
      (now, 0)
    } else {
      (windowStart, windowEarned)
    };
    if (currentEarned + reward.amount > DAILY_EARN_CAP) {
      Runtime.trap("Daily earning cap reached. Try again tomorrow.");
    };
    pendingRewardMap.add(rewardId, { reward with status = #Claimed });
    dailyEarnings.add(caller, (currentStart, currentEarned + reward.amount));
    let bal = switch (anonCashBalance.get(caller)) {
      case (null) { 0 };
      case (?b) { b };
    };
    let newBal = bal + reward.amount;
    anonCashBalance.add(caller, newBal);
    newBal;
  };

  public query ({ caller }) func getReferralStats() : async ReferralStats {
    let code = principalToReferralCode.get(caller);
    let totalRefs = switch (userReferrals.get(caller)) {
      case (null) { 0 };
      case (?arr) { arr.size() };
    };
    let qualifiedCount = switch (level1Issued.get(caller)) {
      case (null) { 0 };
      case (?arr) { arr.size() };
    };
    let bal = switch (anonCashBalance.get(caller)) {
      case (null) { 0 };
      case (?b) { b };
    };
    var pending : Nat = 0;
    let ids = switch (userPendingRewardIds.get(caller)) {
      case (null) { [] };
      case (?arr) { arr };
    };
    for (id in ids.vals()) {
      switch (pendingRewardMap.get(id)) {
        case (?r) {
          switch (r.status) {
            case (#Claimed) {};
            case (_) { pending += r.amount };
          };
        };
        case (null) {};
      };
    };
    let l2Done = switch (level2Issued.get(caller)) {
      case (null) { false };
      case (?b) { b };
    };
    let l3Count = switch (level3Issued.get(caller)) {
      case (null) { 0 };
      case (?arr) { arr.size() };
    };
    {
      referralCode = code;
      totalReferrals = totalRefs;
      qualifiedReferrals = qualifiedCount;
      anonCashBalance = bal;
      pendingAmount = pending;
      level1Count = qualifiedCount;
      level2Unlocked = l2Done;
      level3Count = l3Count;
    };
  };

  // =====================
  // TRADE REVIEW ENDPOINTS
  // =====================

  public shared ({ caller }) func submitTradeReview(tradeId : Nat, stars : Nat, comment : Text) : async TradeReview {
    if (stars < 1 or stars > 5) { Runtime.trap("Stars must be between 1 and 5") };
    let trade = switch (p2pTrades.get(tradeId)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?t) { t };
    };
    // Only buyer can review seller, only after confirmed/completed
    if (trade.buyerPrincipal != caller) {
      Runtime.trap("Only buyer can submit a review");
    };
    switch (trade.status) {
      case (#Confirmed) {};
      case (_) { Runtime.trap("Trade must be confirmed before reviewing") };
    };
    // Prevent duplicate reviews
    for ((_, rv) in tradeReviews.entries()) {
      if (rv.tradeId == tradeId and rv.reviewerPrincipal == caller) {
        Runtime.trap("You already reviewed this trade");
      };
    };
    let reviewId = reviewIdCounter;
    reviewIdCounter += 1;
    let review : TradeReview = {
      id = reviewId;
      tradeId = tradeId;
      reviewerPrincipal = caller;
      targetPrincipal = trade.sellerPrincipal;
      targetAnonId = trade.sellerAnonId;
      stars = stars;
      comment = comment;
      createdAt = Time.now();
    };
    tradeReviews.add(reviewId, review);
    review;
  };

  public query func getSellerReviews(sellerAnonId : Text) : async [TradeReview] {
    tradeReviews.values().filter(
      func(r : TradeReview) : Bool { r.targetAnonId == sellerAnonId }
    ).toArray();
  };

  public query func getSellerStats(sellerAnonId : Text) : async SellerStats {
    let reviews = tradeReviews.values().filter(
      func(r : TradeReview) : Bool { r.targetAnonId == sellerAnonId }
    ).toArray();
    let totalReviews = reviews.size();
    var totalStars : Nat = 0;
    for (r in reviews.vals()) { totalStars += r.stars };
    let avg : Nat = if (totalReviews == 0) { 0 } else {
      (totalStars * 10) / totalReviews
    };
    let completedCount = p2pTrades.values().filter(
      func(t : P2PTrade) : Bool {
        t.sellerAnonId == sellerAnonId and (
          switch (t.status) { case (#Confirmed) { true }; case (_) { false } }
        )
      }
    ).toArray().size();
    { averageRating = avg; totalReviews = totalReviews; completedTrades = completedCount };
  };

  // =====================
  // TRADE CHAT ENDPOINTS
  // =====================

  public shared ({ caller }) func sendTradeMessage(tradeId : Nat, content : Text) : async TradeMessage {
    let trade = switch (p2pTrades.get(tradeId)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?t) { t };
    };
    if (trade.buyerPrincipal != caller and trade.sellerPrincipal != caller) {
      Runtime.trap("Not your trade");
    };
    // Only allow chat on active trades
    switch (trade.status) {
      case (#Cancelled) { Runtime.trap("Trade is cancelled") };
      case (#Rejected) { Runtime.trap("Trade is rejected") };
      case (_) {};
    };
    if (content.size() == 0 or content.size() > 500) {
      Runtime.trap("Message must be between 1 and 500 characters");
    };
    let senderUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?u) { u };
    };
    let msgId = tradeMessageIdCounter;
    tradeMessageIdCounter += 1;
    let msg : TradeMessage = {
      id = msgId;
      tradeId = tradeId;
      senderPrincipal = caller;
      senderAnonId = senderUser.anonymousId;
      content = content;
      createdAt = Time.now();
    };
    tradeMessages.add(msgId, msg);
    msg;
  };

  public query ({ caller }) func getTradeMessages(tradeId : Nat) : async [TradeMessage] {
    let trade = switch (p2pTrades.get(tradeId)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?t) { t };
    };
    if (trade.buyerPrincipal != caller and trade.sellerPrincipal != caller) {
      Runtime.trap("Not your trade");
    };
    tradeMessages.values().filter(
      func(m : TradeMessage) : Bool { m.tradeId == tradeId }
    ).toArray();
  };


  // =====================
  // ADMIN CONTROL PANEL
  // =====================

  func isAdminCaller(caller : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, caller)
  };

  public shared ({ caller }) func openDispute(tradeId : Nat, evidence : Text) : async () {
    let trade = switch (p2pTrades.get(tradeId)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?t) { t };
    };
    if (trade.buyerPrincipal != caller and trade.sellerPrincipal != caller) {
      Runtime.trap("Unauthorized: Not your trade");
    };
    switch (trade.status) {
      case (#PaymentSent) {};
      case (#Confirmed) {};
      case (_) { Runtime.trap("Cannot open dispute for this trade status") };
    };
    p2pTrades.add(tradeId, { trade with status = #Disputed });
    disputeEvidence.add(tradeId, evidence);
  };

  public shared ({ caller }) func resolveDispute(tradeId : Nat, favorBuyer : Bool) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let trade = switch (p2pTrades.get(tradeId)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?t) { t };
    };
    switch (trade.status) {
      case (#Disputed) {};
      case (_) { Runtime.trap("Trade is not in Disputed status") };
    };
    if (favorBuyer) {
      // Transfer ID to buyer
      let buyerUser = switch (users.get(trade.buyerPrincipal)) {
        case (null) { Runtime.trap("Buyer not found") };
        case (?u) { u };
      };
      let sellerUser = switch (users.get(trade.sellerPrincipal)) {
        case (null) { Runtime.trap("Seller not found") };
        case (?u) { u };
      };
      anonIdToPrincipal.remove(buyerUser.anonymousId);
      let newBuyerUser = { buyerUser with anonymousId = trade.listedAnonId };
      users.add(trade.buyerPrincipal, newBuyerUser);
      anonIdToPrincipal.add(trade.listedAnonId, trade.buyerPrincipal);
      switch (userProfiles.get(trade.buyerPrincipal)) {
        case (?p) { userProfiles.add(trade.buyerPrincipal, { p with anonymousId = trade.listedAnonId }) };
        case (null) {};
      };
      p2pTrades.add(tradeId, { trade with status = #Confirmed });
      switch (p2pListings.get(trade.listingId)) {
        case (?listing) { p2pListings.add(trade.listingId, { listing with status = #Sold }) };
        case (null) {};
      };
      // Give seller a new ID asynchronously is not possible here, skip for dispute resolution
    } else {
      // Return to seller: cancel and unlock
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

  public query ({ caller }) func getAllTradesAdmin() : async [P2PTrade] {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    p2pTrades.values().toArray()
  };

  public query ({ caller }) func getAllUsersAdmin() : async [User] {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    users.values().toArray()
  };

  public shared ({ caller }) func freezeUser(target : Principal) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    frozenUsers.add(target, true);
  };

  public shared ({ caller }) func unfreezeUser(target : Principal) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    frozenUsers.remove(target);
  };

  public query ({ caller }) func isUserFrozen(target : Principal) : async Bool {
    switch (frozenUsers.get(target)) {
      case (?v) { v };
      case (null) { false };
    };
  };

  public type AdminDashboard = {
    totalUsers : Nat;
    totalTrades : Nat;
    activeTrades : Nat;
    completedTrades : Nat;
    disputedTrades : Nat;
    commissionBalance : Nat;
    totalListings : Nat;
    activeListings : Nat;
  };

  public query ({ caller }) func getAdminDashboard() : async AdminDashboard {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    var active = 0;
    var completed = 0;
    var disputed = 0;
    for ((_, trade) in p2pTrades.entries()) {
      switch (trade.status) {
        case (#Pending) { active += 1 };
        case (#PaymentSent) { active += 1 };
        case (#Confirmed) { completed += 1 };
        case (#Disputed) { disputed += 1 };
        case (_) {};
      };
    };
    var activeL = 0;
    for ((_, listing) in p2pListings.entries()) {
      switch (listing.status) {
        case (#Active) { activeL += 1 };
        case (_) {};
      };
    };
    {
      totalUsers = users.size();
      totalTrades = p2pTrades.size();
      activeTrades = active;
      completedTrades = completed;
      disputedTrades = disputed;
      commissionBalance = systemCommissionBalance;
      totalListings = p2pListings.size();
      activeListings = activeL;
    }
  };

  public query ({ caller }) func getDisputedTrades() : async [P2PTrade] {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    p2pTrades.values().filter(
      func(t : P2PTrade) : Bool { t.status == #Disputed }
    ).toArray()
  };

  public query ({ caller }) func getDisputeEvidence(tradeId : Nat) : async ?Text {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    disputeEvidence.get(tradeId)
  };

  public query ({ caller }) func getCommissionBalance() : async Nat {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    systemCommissionBalance
  };


  // =====================
  // ID SLOT SYSTEM
  // =====================

  func getMaxSlots(caller : Principal) : Nat {
    // Referral bonus: +1 per invited user (from userReferrals)
    let refCount = switch (userReferrals.get(caller)) {
      case (?arr) { arr.size() };
      case (null) { 0 };
    };
    let referralBonus = if (refCount > 0) 1 else 0;

    // Activity bonus: +1 if sent >= ACTIVE_MSG_THRESHOLD messages
    let msgCount = switch (userMsgCount.get(caller)) {
      case (?n) { n };
      case (null) { 0 };
    };
    let activityBonus = if (msgCount >= ACTIVE_MSG_THRESHOLD) 1 else 0;

    // Premium bonus
    let premiumBonus = switch (userPremiumSlots.get(caller)) {
      case (?true) { ID_SLOT_PREMIUM_BONUS };
      case (_) { 0 };
    };

    let total = ID_SLOT_BASE + referralBonus + activityBonus + premiumBonus;
    if (total > ID_SLOT_HARD_CAP) ID_SLOT_HARD_CAP else total;
  };

  public type IdSlotInfo = {
    ownedIds : [Text];
    maxSlots : Nat;
    referralBonus : Nat;
    activityBonus : Nat;
    premiumBonus : Nat;
    inactiveIds : [Text];
  };

  public query ({ caller }) func getIdSlotInfo() : async IdSlotInfo {
    let owned = switch (userOwnedIds.get(caller)) {
      case (?arr) { arr };
      case (null) { [] };
    };
    let refCount = switch (userReferrals.get(caller)) {
      case (?arr) { arr.size() };
      case (null) { 0 };
    };
    let referralBonus = if (refCount > 0) 1 else 0;
    let msgCount = switch (userMsgCount.get(caller)) {
      case (?n) { n };
      case (null) { 0 };
    };
    let activityBonus = if (msgCount >= ACTIVE_MSG_THRESHOLD) 1 else 0;
    let premiumBonus = switch (userPremiumSlots.get(caller)) {
      case (?true) { ID_SLOT_PREMIUM_BONUS };
      case (_) { 0 };
    };
    let now = Time.now();
    let inactive = owned.filter(func(id : Text) : Bool {
      switch (idLastActivity.get(id)) {
        case (?last) { (now - last) > ID_INACTIVE_NS };
        case (null) { false };
      };
    });
    {
      ownedIds = owned;
      maxSlots = getMaxSlots(caller);
      referralBonus = referralBonus;
      activityBonus = activityBonus;
      premiumBonus = premiumBonus;
      inactiveIds = inactive;
    };
  };

  public shared ({ caller }) func createAdditionalId() : async Text {
    let maxSlots = getMaxSlots(caller);
    let owned = switch (userOwnedIds.get(caller)) {
      case (?arr) { arr };
      case (null) { [] };
    };
    if (owned.size() >= maxSlots) {
      Runtime.trap("ID slot limit reached");
    };
    let newId = await generateUniqueId();
    anonIdToPrincipal.add(newId, caller);
    userOwnedIds.add(caller, appendTextArr(owned, newId));
    idLastActivity.add(newId, Time.now());
    newId;
  };

  public shared ({ caller }) func reclaimId(anonId : Text) : async () {
    let owned = switch (userOwnedIds.get(caller)) {
      case (?arr) { arr };
      case (null) { Runtime.trap("No IDs owned") };
    };
    // Cannot reclaim primary ID (first one)
    switch (users.get(caller)) {
      case (?user) {
        if (user.anonymousId == anonId) {
          Runtime.trap("Cannot reclaim primary ID");
        };
      };
      case (null) {};
    };
    let filtered = owned.filter(func(id : Text) : Bool { id != anonId });
    userOwnedIds.add(caller, filtered);
    // Remove from anonIdToPrincipal so it can be reused
    anonIdToPrincipal.remove(anonId);
    usedIds.remove(anonId);
  };

  public shared ({ caller }) func markIdActive(anonId : Text) : async () {
    idLastActivity.add(anonId, Time.now());
  };

  public shared ({ caller }) func unlockPremiumSlots() : async () {
    userPremiumSlots.add(caller, true);
  };

  func appendTextArr(arr : [Text], t : Text) : [Text] {
    let size = arr.size();
    Array.tabulate<Text>(size + 1, func(i) { if (i < size) arr[i] else t });
  };

};
