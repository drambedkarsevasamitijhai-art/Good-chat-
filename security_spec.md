# Good Chat Live Location — Security Specification (Phase 0)

## 1. Data Invariants

1. **Strict Ownership (`users/{userId}`)**: A user profile and its location sharing settings may ONLY be read, created, updated, or deleted by the verified authenticated user whose `request.auth.uid == userId`.
2. **Explicit Consent Mandate (`locationShares/{shareId}`)**: A live location session cannot be created unless `consentGranted == true`, `active == true`, and `ownerUid == request.auth.uid`.
3. **Zero Unauthorized Location Exposure**: A `locationShares/{shareId}` document may ONLY be read (`get` or `list`) by either `resource.data.ownerUid == request.auth.uid` OR an authenticated verified user whose email is explicitly present in `resource.data.allowedViewerEmails`.
4. **Terminal State Locking**: Once a live location session is stopped (`active == false`), no further updates are permitted on that document (the user starts a fresh session with a new `shareId` when sharing again).
5. **Immutable Audit Fields & Server Timestamps**: `ownerUid`, `chatKey`, `durationMinutes`, `consentGranted`, `createdAt`, and `expiresAtMs` are immutable after creation. `createdAt` (on create) and `updatedAt` (on create & update) MUST equal `request.time`.
6. **Strict Coordinate, Duration & Array Bounds**: `latitude` in `[-90, 90]`, `longitude` in `[-180, 180]`, `accuracy` in `[0, 100000]`, `durationMinutes` in `[15, 60, 480]`, and `allowedViewerEmails` strictly bounded to `<= 10` entries.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Fail with `PERMISSION_DENIED`)

1. **Unauthenticated Read**: `get /locationShares/share_1` with `auth = null`.
2. **Unauthorized Contact Read**: `get /locationShares/share_1` as `uid: "attacker"`, `email: "attacker@example.com"` not in `allowedViewerEmails`.
3. **Blanket Collection Scrape**: `list /locationShares` without filtering to `ownerUid == uid` or `allowedViewerEmails array-contains email`.
4. **Unverified Email Access**: `create /locationShares/share_1` where `auth.token.email_verified == false`.
5. **Identity Spoofing on Create**: `create /locationShares/share_2` with `ownerUid: "victim_uid"` while signed in as `attacker_uid`.
6. **Tracking Without Consent**: `create /locationShares/share_3` with `consentGranted: false`.
7. **Shadow Field Injection**: `create /locationShares/share_4` including extra ghost field `isAdmin: true`.
8. **Invalid Duration Bypass**: `create /locationShares/share_5` with `durationMinutes: 99999` (outside `[15, 60, 480]`).
9. **Coordinate Poisoning**: `update /locationShares/share_1` with `latitude: 500` or `latitude: "invalid"`.
10. **Terminal State Resurrection**: `update /locationShares/share_stopped` (`existing().active == false`) setting `active: true`.
11. **Client Timestamp Spoofing**: `update /locationShares/share_1` with client-forged `updatedAt` != `request.time` or modifying immutable `createdAt`.
12. **Resource Exhaustion / ID Poisoning**: `create /locationShares/<150-char-invalid-id>` or `allowedViewerEmails` containing 25 entries or 500-char strings.
