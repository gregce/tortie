import Foundation
import XCTest
@testable import Tortie

/// The store that keeps one pairing per Mac (Phase 345, build/p345/SPEC.md
/// section 3.1), over secrets and client keys in memory, so nothing here
/// touches a keychain but the test identity `MemoryClientKeys` adopts. The
/// Simulator keychain's half is `MultiMacKeychainTests`.
///
/// Each test names the rule of section 3.1 it holds and fails when that rule
/// is taken out of `ios/Tortie/Door/Keys.swift`.
final class PairingStoreTests: XCTestCase {
    private var v: DoorVectorFile!
    private var certificate: Data!

    override func setUpWithError() throws {
        v = try DoorVectorFile.load()
        certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
    }

    override func tearDown() {
        #if os(iOS)
        TestIdentity.removeFromKeychain()
        #endif
    }

    // MARK: The world

    /// Secrets, client keys and the store over them, with one log of what the
    /// two did in order.
    private struct World {
        let secrets: MemorySecrets
        let keys: MemoryClientKeys
        let store: PairingStore
        let events: KeychainEvents
    }

    private func world() -> World {
        let secrets = MemorySecrets()
        let keys = MemoryClientKeys(spki: v.keys.clientKey)
        let events = KeychainEvents()
        secrets.events = events
        keys.events = events
        return World(secrets: secrets, keys: keys, store: PairingStore(secrets: secrets, clientKeys: keys), events: events)
    }

    /// The whole public name of the Mac labelled `label`.
    private func name(_ label: String) -> String { "\(label).tail00000.ts.net" }

    /// A pairing with the Mac `label`, under a fresh client key (or `key`),
    /// whose identity the world's client keys answer.
    private func mac(_ label: String, _ w: World, pairedAt: Double, key: ClientKey? = nil) throws -> PairedDoor {
        let clientKey = try key ?? w.keys.mint()
        return try XCTUnwrap(PairedDoor(
            endpoint: DoorEndpoint(name: name(label), port: 8443, pin: Base64URL.encode(Data(count: 32))),
            macSigningKey: v.keys.macSigningKey, macExchangeKey: v.keys.macExchangeKey,
            label: "Tortie’s iPhone", pairedAt: pairedAt, keys: PhoneKeys.generate(), clientKey: clientKey,
            certificate: certificate, identity: try w.keys.adopt(certificate, for: clientKey), alerts: .nothing
        ))
    }

    /// A record written straight to `account`, as another build or an
    /// earlier launch left it.
    private func plant(_ door: PairedDoor, at account: String, _ w: World) throws {
        try w.secrets.write(PairingStore.encode(door), account: account)
    }

    private func names(_ doors: [PairedDoor]) -> [String] { doors.map(\.endpoint.name) }

    private func isOtherAccount(_ account: String) -> Bool {
        guard account.hasPrefix("pairing-v2-") else { return false }
        let tail = account.dropFirst("pairing-v2-".count)
        return tail.count == 16 && tail.allSatisfy { "0123456789abcdef".contains($0) }
    }

    private func deletes(_ w: World) -> [String] { w.events.all.filter { $0.hasPrefix("delete ") } }

    /// A record's JSON as an object, so two encodings compare by what they say
    /// and not by the order the encoder wrote the keys in.
    private func json(_ data: Data?) -> NSDictionary? {
        guard let data else { return nil }
        return (try? JSONSerialization.jsonObject(with: data)) as? NSDictionary
    }

    // MARK: One Mac is today's store

    /// Rule 3 and 5, with one Mac: the record goes to `pairing-v2` as
    /// today's encode wrote it, reads back, is held, and `forget()` takes it
    /// and every client key.
    func testOneMacIsTodaysOneRecordStore() throws {
        let w = world()
        let a = try mac("studio", w, pairedAt: 1)
        XCTAssertEqual(try w.store.save(a), PairingStore.account)
        XCTAssertEqual(w.secrets.held, [PairingStore.account])
        XCTAssertEqual(json(w.secrets.item(PairingStore.account)), json(try PairingStore.encode(a)), "the record is not today's encode")
        XCTAssertEqual(w.store.load()?.phoneId, a.phoneId)
        XCTAssertEqual(names(w.store.loadAll()), [a.endpoint.name])
        XCTAssertTrue(w.store.holdsRecord)
        XCTAssertTrue(w.store.holdsRecord(name: a.endpoint.name))
        _ = try w.keys.mint()
        try w.store.forget()
        XCTAssertTrue(w.secrets.isEmpty)
        XCTAssertEqual(w.keys.held, [], "forgetting every pairing forgets every client key")
        XCTAssertFalse(w.store.holdsRecord)
        XCTAssertFalse(w.store.holdsRecord(name: a.endpoint.name))
        XCTAssertNil(w.store.load())
        XCTAssertEqual(PairingStore.account, "pairing-v2")
        XCTAssertEqual(PairingStore.accountPrefix, "pairing-v2-")
        XCTAssertEqual(PairingStore.formerAccount, "pairing-v1")
        XCTAssertEqual(PairingStore.macLimit, 4)
    }

    // MARK: Rule 3, keeping

    /// A second Mac goes to a fresh `pairing-v2-<16 hex>` account and the
    /// first Mac's record is not touched, byte for byte.
    func testASecondMacTakesAFreshAccountAndLeavesTheFirst() throws {
        let w = world()
        let a = try mac("studio", w, pairedAt: 1)
        let b = try mac("laptop", w, pairedAt: 2)
        try w.store.save(a)
        let first = try XCTUnwrap(w.secrets.item(PairingStore.account))
        let account = try w.store.save(b)
        XCTAssertTrue(isOtherAccount(account), account)
        XCTAssertTrue(PairingStore.isPairingAccount(account))
        XCTAssertEqual(w.secrets.item(PairingStore.account), first, "the first Mac's record moved")
        XCTAssertEqual(json(w.secrets.item(account)), json(try PairingStore.encode(b)))
        XCTAssertEqual(Set(w.secrets.held), [PairingStore.account, account])
        XCTAssertEqual(names(w.store.loadAll()), [a.endpoint.name, b.endpoint.name])
        XCTAssertEqual(deletes(w), [], "keeping a second Mac deleted a client key")
    }

    /// A re-pair of a kept Mac replaces its record IN ITS OWN ACCOUNT, the
    /// first Mac's and another's alike, and only after the write deletes the
    /// replaced record's client key. The other Mac's key is not touched.
    func testARePairReplacesInPlaceThenDeletesTheOldTag() throws {
        let w = world()
        let a1 = try mac("studio", w, pairedAt: 1)
        let b1 = try mac("laptop", w, pairedAt: 2)
        try w.store.save(a1)
        let other = try w.store.save(b1)

        let a2 = try mac("studio", w, pairedAt: 3)
        let before = w.events.all.count
        XCTAssertEqual(try w.store.save(a2), PairingStore.account, "the first Mac's re-pair left pairing-v2")
        XCTAssertEqual(
            Array(w.events.all.dropFirst(before)), ["write \(PairingStore.account)", "delete \(a1.clientKey.tag)"],
            "the record was not replaced in place, then its old key deleted"
        )
        XCTAssertEqual(Set(w.secrets.held), [PairingStore.account, other])
        XCTAssertFalse(w.keys.held.contains(a1.clientKey.tag), "the replaced record's key outlived its record")
        XCTAssertTrue(w.keys.held.contains(a2.clientKey.tag))
        XCTAssertTrue(w.keys.held.contains(b1.clientKey.tag), "another Mac's key went with a re-pair")
        XCTAssertEqual(w.store.loadAll().map(\.phoneId), [a2.phoneId, b1.phoneId], "pairing-v2 stays first however late it was re-paired")

        let b2 = try mac("laptop", w, pairedAt: 4)
        let mark = w.events.all.count
        XCTAssertEqual(try w.store.save(b2), other, "another Mac's re-pair left its account")
        let after = Array(w.events.all.dropFirst(mark))
        let write = try XCTUnwrap(after.firstIndex(of: "write \(other)"))
        let delete = try XCTUnwrap(after.firstIndex(of: "delete \(b1.clientKey.tag)"))
        XCTAssertLessThan(write, delete, "the old key went before the new record was written")
        XCTAssertEqual(deletes(w).count, 2)
        XCTAssertEqual(Set(w.secrets.held), [PairingStore.account, other])
        XCTAssertEqual(w.store.loadAll().map(\.phoneId), [a2.phoneId, b2.phoneId])
    }

    /// A new Mac takes `pairing-v2` when no kept record holds it, so build 10
    /// reads it.
    func testANewMacTakesPairingV2WhenItIsFree() throws {
        let w = world()
        try w.store.save(try mac("studio", w, pairedAt: 1))
        let other = try w.store.save(try mac("laptop", w, pairedAt: 2))
        try w.store.forget(name: name("studio"))
        XCTAssertEqual(w.secrets.held, [other])
        let c = try mac("desk", w, pairedAt: 3)
        XCTAssertEqual(try w.store.save(c), PairingStore.account)
        XCTAssertEqual(names(w.store.loadAll()), [name("desk"), name("laptop")])
    }

    /// A record that cannot be read is never written over: a read or a list
    /// that throws throws from `save`, and nothing is written or deleted.
    func testSaveWritesNothingOverARecordItCouldNotRead() throws {
        let w = world()
        try w.store.save(try mac("studio", w, pairedAt: 1))
        let b = try mac("laptop", w, pairedAt: 2)
        let mark = w.events.all.count
        w.secrets.refuseReads = [PairingStore.account]
        XCTAssertThrowsError(try w.store.save(b))
        w.secrets.refuseReads = []
        w.secrets.refuseList = true
        XCTAssertThrowsError(try w.store.save(b))
        XCTAssertEqual(Array(w.events.all.dropFirst(mark)), [], "a save after a failed read wrote or deleted something")
        XCTAssertEqual(w.secrets.held, [PairingStore.account])
    }

    // MARK: The cap

    /// D12: four Macs are kept and a fifth is refused by `admits` and by
    /// `save`, which writes nothing; a kept Mac is admitted and re-paired in
    /// place at four.
    func testAFifthMacIsRefusedByAdmitsAndBySave() throws {
        let w = world()
        XCTAssertTrue(w.store.admits(name("one")))
        for (i, label) in ["one", "two", "three", "four"].enumerated() {
            XCTAssertTrue(w.store.admits(name(label)), label)
            try w.store.save(try mac(label, w, pairedAt: Double(i + 1)))
        }
        XCTAssertEqual(w.store.loadAll().count, PairingStore.macLimit)
        XCTAssertFalse(w.store.admits(name("five")), "a fifth Mac was admitted")
        XCTAssertTrue(w.store.admits(name("three")), "a kept Mac was refused at four")
        let held = w.secrets.held
        let mark = w.events.all.count
        let five = try mac("five", w, pairedAt: 5)
        XCTAssertThrowsError(try w.store.save(five)) { XCTAssertEqual($0 as? KeysFailure, .tooManyMacs) }
        XCTAssertEqual(Array(w.events.all.dropFirst(mark)), [], "a refused fifth Mac wrote or deleted something")
        XCTAssertEqual(w.secrets.held, held)

        let threeAgain = try mac("three", w, pairedAt: 6)
        try w.store.save(threeAgain)
        XCTAssertEqual(w.secrets.held, held, "a re-pair at four took another account")
        XCTAssertEqual(names(w.store.loadAll()), [name("one"), name("two"), name("four"), name("three")])
    }

    // MARK: Rule 1, the accounts

    /// Only `pairing-v2` and `pairing-v2-` with exactly 16 lowercase hex
    /// digits are read; every other account under the service is never read
    /// and never removed, by any member of the store.
    func testNoOtherAccountIsReadOrRemoved() throws {
        let w = world()
        let foreign = [
            "other", "pairing-v3", "pairing-v2-", "pairing-v2-0123",
            "pairing-v2-0123456789ABCDEF", "pairing-v2-0123456789abcdef0", "pairing-v2-0123456789abcdeg",
            "pairing-v2x0123456789abcdef", "Pairing-v2"
        ]
        for account in foreign {
            XCTAssertFalse(PairingStore.isPairingAccount(account), account)
            try w.secrets.write(Data("not this store's".utf8), account: account)
        }
        XCTAssertTrue(PairingStore.isPairingAccount("pairing-v2"))
        XCTAssertTrue(PairingStore.isPairingAccount("pairing-v2-0123456789abcdef"))
        let a = try mac("studio", w, pairedAt: 1)
        let b = try mac("laptop", w, pairedAt: 2)
        try w.store.save(a)
        try w.store.save(b)
        _ = w.store.loadAll()
        _ = w.store.admits(name("desk"))
        _ = w.store.holdsRecord
        _ = w.store.holdsRecord(name: a.endpoint.name)
        w.store.sweepOrphans()
        try w.store.forget(name: b.endpoint.name)
        try w.store.forget()
        XCTAssertEqual(Set(w.secrets.reads).intersection(foreign), [], "the store read an account that is not its own")
        XCTAssertEqual(Set(w.secrets.held), Set(foreign), "the store removed an account that is not its own")
    }

    /// ba8: every account the store writes is `pairing-v2` or the prefix and
    /// 16 hex digits the PHONE made; none is a record field, and the same
    /// pairing saved into two stores takes two different accounts, so the
    /// account is not derived from the record.
    func testEveryAccountIsOneOfTheTwoShapesAndNoneIsARecordField() throws {
        let one = world()
        let two = world()
        try one.store.save(try mac("studio", one, pairedAt: 1))
        try two.store.save(try mac("studio", two, pairedAt: 1))
        let b = try mac("laptop", one, pairedAt: 2)
        let first = try one.store.save(b)
        let second = try two.store.save(b)
        XCTAssertNotEqual(first, second, "the account was derived from the record")
        for account in [first, second] + one.secrets.held + two.secrets.held {
            XCTAssertTrue(account == PairingStore.account || isOtherAccount(account), account)
            for field in [b.endpoint.name, "laptop", b.endpoint.pin, b.label, b.clientKey.tag, b.phoneId, b.fingerprint] {
                XCTAssertFalse(account.contains(field), "\(account) carries the record field \(field)")
            }
        }
    }

    // MARK: Rule 2, reading

    /// D9: `pairing-v2` first whatever its `pairedAt`, then the rest by
    /// `pairedAt`, then by account; the list's own order does not decide it.
    func testTheOrderIsTheFirstMacThenWhenEachWasPaired() throws {
        let w = world()
        w.secrets.listReversed = true
        try plant(try mac("first", w, pairedAt: 50), at: PairingStore.account, w)
        try plant(try mac("late", w, pairedAt: 30), at: "pairing-v2-0000000000000001", w)
        try plant(try mac("tiezz", w, pairedAt: 20), at: "pairing-v2-ffffffffffffffff", w)
        try plant(try mac("tieaa", w, pairedAt: 20), at: "pairing-v2-0000000000000002", w)
        XCTAssertEqual(names(w.store.loadAll()), [name("first"), name("tieaa"), name("tiezz"), name("late")])
        XCTAssertEqual(w.store.load()?.endpoint.name, name("first"))
    }

    /// D11: a record that does not read back whole removes ONLY ITSELF, by its
    /// own account: no other record and no client key, its own included.
    func testACorruptRecordRemovesOnlyItself() throws {
        let w = world()
        let a = try mac("studio", w, pairedAt: 1)
        let b = try mac("laptop", w, pairedAt: 2)
        let c = try mac("desk", w, pairedAt: 3)
        try w.store.save(a)
        let bAccount = try w.store.save(b)
        let cAccount = try w.store.save(c)
        try w.secrets.write(Data("not a record".utf8), account: bAccount)
        let mark = w.events.all.count
        XCTAssertEqual(w.store.loadAll().map(\.phoneId), [a.phoneId, c.phoneId])
        XCTAssertEqual(Array(w.events.all.dropFirst(mark)), ["remove \(bAccount)"], "more than the corrupt record went")
        XCTAssertEqual(Set(w.secrets.held), [PairingStore.account, cAccount])
        XCTAssertEqual(Set(w.keys.held), [a.clientKey.tag, b.clientKey.tag, c.clientKey.tag], "a corrupt record took a client key")
    }

    /// The same for every way a record of build 10's shape stops reading back
    /// (Phase 316.2's edits), at the first Mac's account beside a second Mac,
    /// and for a record whose identity is gone.
    func testEveryBrokenRecordRemovesOnlyItself() throws {
        for edit in [("name", "100.64.0.1"), ("port", "8823"), ("clientTag", "not-a-tag"), ("certificate", "AAAA"), ("v", "3")] {
            let w = world()
            try w.store.save(try mac("studio", w, pairedAt: 1))
            let b = try mac("laptop", w, pairedAt: 2)
            let bAccount = try w.store.save(b)
            var record = try XCTUnwrap(JSONSerialization.jsonObject(with: try XCTUnwrap(w.secrets.item(PairingStore.account))) as? [String: Any])
            switch edit.0 {
            case "port": record["port"] = 8823
            case "v": record["v"] = 3
            default: record[edit.0] = edit.1
            }
            try w.secrets.write(try JSONSerialization.data(withJSONObject: record), account: PairingStore.account)
            XCTAssertEqual(names(w.store.loadAll()), [b.endpoint.name], edit.0)
            XCTAssertEqual(w.secrets.held, [bAccount], "the broken record stayed, or another went (\(edit.0))")
            XCTAssertEqual(deletes(w), [], "a broken record deleted a client key (\(edit.0))")
        }
        let w = world()
        let a = try mac("studio", w, pairedAt: 1)
        let b = try mac("laptop", w, pairedAt: 2)
        try w.store.save(a)
        let bAccount = try w.store.save(b)
        w.keys.delete(tag: b.clientKey.tag)
        XCTAssertEqual(names(w.store.loadAll()), [a.endpoint.name], "a pairing whose client key is gone is not a pairing")
        XCTAssertNil(w.secrets.item(bAccount))
        XCTAssertNotNil(w.secrets.item(PairingStore.account))
        XCTAssertEqual(w.keys.held, [a.clientKey.tag])
    }

    /// D11: two records with one public name keep the later `pairedAt`, and
    /// the other record is removed, whichever account each is in; a tie keeps
    /// the one first in order. No client key is deleted.
    func testADuplicateNameKeepsTheLaterPairing() throws {
        let later = world()
        let old = try mac("studio", later, pairedAt: 10)
        let new = try mac("studio", later, pairedAt: 20)
        try plant(old, at: PairingStore.account, later)
        try plant(new, at: "pairing-v2-00000000000000aa", later)
        XCTAssertEqual(later.store.loadAll().map(\.phoneId), [new.phoneId])
        XCTAssertEqual(later.secrets.held, ["pairing-v2-00000000000000aa"])
        XCTAssertEqual(deletes(later), [])

        let earlier = world()
        let first = try mac("studio", earlier, pairedAt: 20)
        let stale = try mac("studio", earlier, pairedAt: 10)
        try plant(first, at: PairingStore.account, earlier)
        try plant(stale, at: "pairing-v2-00000000000000aa", earlier)
        XCTAssertEqual(earlier.store.loadAll().map(\.phoneId), [first.phoneId])
        XCTAssertEqual(earlier.secrets.held, [PairingStore.account])

        let tie = world()
        let x = try mac("studio", tie, pairedAt: 10)
        let y = try mac("studio", tie, pairedAt: 10)
        try plant(y, at: "pairing-v2-00000000000000bb", tie)
        try plant(x, at: "pairing-v2-00000000000000aa", tie)
        XCTAssertEqual(tie.store.loadAll().map(\.phoneId), [x.phoneId])
        XCTAssertEqual(tie.secrets.held, ["pairing-v2-00000000000000aa"])
    }

    /// D11: past four, the records after the fourth in order are removed,
    /// and no client key with them.
    func testPastFourTheRestAreRemoved() throws {
        let w = world()
        try plant(try mac("one", w, pairedAt: 9), at: PairingStore.account, w)
        try plant(try mac("two", w, pairedAt: 1), at: "pairing-v2-0000000000000001", w)
        try plant(try mac("three", w, pairedAt: 2), at: "pairing-v2-0000000000000002", w)
        try plant(try mac("four", w, pairedAt: 3), at: "pairing-v2-0000000000000003", w)
        try plant(try mac("five", w, pairedAt: 4), at: "pairing-v2-0000000000000004", w)
        XCTAssertEqual(names(w.store.loadAll()), [name("one"), name("two"), name("three"), name("four")])
        XCTAssertNil(w.secrets.item("pairing-v2-0000000000000004"))
        XCTAssertEqual(w.secrets.held.count, 4)
        XCTAssertEqual(deletes(w), [])
        XCTAssertEqual(w.keys.held.count, 5)
    }

    /// An account that cannot be read is neither kept nor removed; a list
    /// that cannot be made reads `pairing-v2` alone, as build 10 does, and
    /// removes nothing.
    func testWhatCannotBeReadIsNeitherKeptNorRemoved() throws {
        let w = world()
        let a = try mac("studio", w, pairedAt: 1)
        try w.store.save(a)
        let other = try w.store.save(try mac("laptop", w, pairedAt: 2))
        w.secrets.refuseReads = [other]
        let mark = w.events.all.count
        XCTAssertEqual(names(w.store.loadAll()), [a.endpoint.name])
        w.secrets.refuseReads = []
        w.secrets.refuseList = true
        XCTAssertEqual(names(w.store.loadAll()), [a.endpoint.name])
        XCTAssertEqual(Array(w.events.all.dropFirst(mark)), [], "a read that failed removed or deleted something")
        XCTAssertEqual(Set(w.secrets.held), [PairingStore.account, other])
    }

    /// Build 10's record reads back: one written in exactly build 10's shape
    /// (the twelve keys, `v: 2`) at `pairing-v2`, and every record this build
    /// writes is that shape, with no key build 10 does not know.
    func testBuild10sRecordReadsBackAndIsWhatThisBuildWrites() throws {
        let w = world()
        let a = try mac("studio", w, pairedAt: 1_760_000_000_000)
        let build10: [String: Any] = [
            "v": 2, "name": a.endpoint.name, "port": a.endpoint.port, "fp": a.endpoint.pin,
            "dk": a.macSigningKey, "dx": a.macExchangeKey, "label": a.label, "pairedAt": a.pairedAt,
            "signingSeed": Base64URL.encode(a.keys.signing.rawRepresentation),
            "exchangeSeed": Base64URL.encode(a.keys.exchange.rawRepresentation),
            "clientTag": a.clientKey.tag, "certificate": Base64URL.encode(a.certificate)
        ]
        try w.secrets.write(try JSONSerialization.data(withJSONObject: build10), account: PairingStore.account)
        let back = try XCTUnwrap(w.store.load())
        XCTAssertEqual(back.endpoint, a.endpoint)
        XCTAssertEqual(back.phoneId, a.phoneId)
        XCTAssertEqual(back.binding, a.binding)
        XCTAssertEqual(back.clientKey, a.clientKey)
        XCTAssertEqual(back.pairedAt, a.pairedAt)

        let b = try mac("laptop", w, pairedAt: 2)
        let account = try w.store.save(b)
        let written = try XCTUnwrap(JSONSerialization.jsonObject(with: try XCTUnwrap(w.secrets.item(account))) as? [String: Any])
        XCTAssertEqual(Set(written.keys), Set(build10.keys), "this build writes a key build 10 does not know")
        XCTAssertEqual(written["v"] as? Int, 2)
        XCTAssertEqual(json(w.secrets.item(account)), json(try PairingStore.encode(b)))
    }

    // MARK: Rule 4, one Mac forgotten

    /// `forget(name:)` removes the record FIRST and only then its client key;
    /// the other Mac's record and key are untouched.
    func testForgetOneMacRemovesItsRecordBeforeItsKey() throws {
        let w = world()
        let a = try mac("studio", w, pairedAt: 1)
        let b = try mac("laptop", w, pairedAt: 2)
        try w.store.save(a)
        let other = try w.store.save(b)
        let mark = w.events.all.count
        try w.store.forget(name: b.endpoint.name)
        XCTAssertEqual(Array(w.events.all.dropFirst(mark)), ["remove \(other)", "delete \(b.clientKey.tag)"])
        XCTAssertEqual(w.secrets.held, [PairingStore.account])
        XCTAssertEqual(w.keys.held, [a.clientKey.tag])
        XCTAssertFalse(w.store.holdsRecord(name: b.endpoint.name))
        XCTAssertTrue(w.store.holdsRecord(name: a.endpoint.name))
        XCTAssertEqual(w.store.loadAll().map(\.phoneId), [a.phoneId])
    }

    /// A removal, a list or a read that throws throws from `forget(name:)`
    /// before any client key is touched, so "Nothing was changed." is true.
    func testAForgetThatCannotRemoveTouchesNoKey() throws {
        let w = world()
        try w.store.save(try mac("studio", w, pairedAt: 1))
        let b = try mac("laptop", w, pairedAt: 2)
        let other = try w.store.save(b)
        let held = w.keys.held
        let mark = w.events.all.count
        w.secrets.refuseRemoves = [other]
        XCTAssertThrowsError(try w.store.forget(name: b.endpoint.name))
        w.secrets.refuseRemoves = []
        w.secrets.refuseList = true
        XCTAssertThrowsError(try w.store.forget(name: b.endpoint.name))
        w.secrets.refuseList = false
        w.secrets.refuseReads = [PairingStore.account]
        XCTAssertThrowsError(try w.store.forget(name: b.endpoint.name))
        XCTAssertTrue(w.store.holdsRecord(name: b.endpoint.name), "a record that could not be read was taken for gone")
        w.secrets.refuseReads = []
        XCTAssertEqual(Array(w.events.all.dropFirst(mark)), [], "a forget that failed touched something")
        XCTAssertEqual(w.keys.held, held)
        XCTAssertTrue(w.store.holdsRecord(name: b.endpoint.name))
    }

    /// A client key two records name survives one record's forget, and one
    /// record's re-pair.
    func testATagTwoRecordsNameSurvivesOne() throws {
        let w = world()
        let shared = try w.keys.mint()
        let a = try mac("studio", w, pairedAt: 1, key: shared)
        let b = try mac("laptop", w, pairedAt: 2, key: shared)
        try w.store.save(a)
        try w.store.save(b)
        try w.store.forget(name: a.endpoint.name)
        XCTAssertTrue(w.keys.held.contains(shared.tag), "a key another record names went with one forget")
        XCTAssertEqual(w.store.loadAll().map(\.phoneId), [b.phoneId])

        let again = world()
        let key = try again.keys.mint()
        try again.store.save(try mac("studio", again, pairedAt: 1, key: key))
        try again.store.save(try mac("laptop", again, pairedAt: 2, key: key))
        try again.store.save(try mac("studio", again, pairedAt: 3))
        XCTAssertTrue(again.keys.held.contains(key.tag), "a key another record names went with a re-pair")
    }

    /// Forgetting the LAST Mac is the one-Mac forget exactly: the record
    /// first, then the former record and every client key the app holds, an
    /// attempt's leftover included.
    func testForgettingTheLastMacIsTodaysForget() throws {
        let w = world()
        let a = try mac("studio", w, pairedAt: 1)
        try w.store.save(a)
        try w.secrets.write(Data("tailnet".utf8), account: PairingStore.formerAccount)
        let leftover = try w.keys.mint()
        let mark = w.events.all.count
        try w.store.forget(name: a.endpoint.name)
        let after = Array(w.events.all.dropFirst(mark))
        XCTAssertEqual(after.first, "remove \(PairingStore.account)", "a key went before the record")
        XCTAssertEqual(Set(after.filter { $0.hasPrefix("delete ") }), ["delete \(a.clientKey.tag)", "delete \(leftover.tag)"])
        XCTAssertTrue(w.secrets.isEmpty)
        XCTAssertEqual(w.keys.held, [])
        XCTAssertFalse(w.store.holdsRecord)
    }

    /// A name no record holds is a no-op: nothing removed, nothing deleted.
    func testANameNoRecordHoldsTouchesNothing() throws {
        let w = world()
        try w.store.save(try mac("studio", w, pairedAt: 1))
        try w.store.save(try mac("laptop", w, pairedAt: 2))
        let held = w.secrets.held
        let keys = w.keys.held
        let mark = w.events.all.count
        try w.store.forget(name: name("desk"))
        try w.store.forget(name: "studio")
        XCTAssertEqual(Array(w.events.all.dropFirst(mark)), [])
        XCTAssertEqual(w.secrets.held, held)
        XCTAssertEqual(w.keys.held, keys)
    }

    // MARK: Rule 5, every Mac forgotten

    /// `forget()` removes every record FIRST, each with `try`, then the
    /// former record, then every client key; a removal or a list that throws
    /// throws before any key is touched.
    func testForgetEveryMacRemovesEveryRecordThenEveryKey() throws {
        let w = world()
        for (i, label) in ["studio", "laptop", "desk"].enumerated() {
            try w.store.save(try mac(label, w, pairedAt: Double(i + 1)))
        }
        try w.secrets.write(Data("tailnet".utf8), account: PairingStore.formerAccount)
        _ = try w.keys.mint()
        let accounts = w.secrets.held.filter(PairingStore.isPairingAccount)
        XCTAssertEqual(accounts.count, 3)

        let refused = try XCTUnwrap(accounts.last)
        w.secrets.refuseRemoves = [refused]
        XCTAssertThrowsError(try w.store.forget())
        XCTAssertEqual(deletes(w), [], "a key went while a record stayed")
        XCTAssertNotNil(w.secrets.item(refused))
        w.secrets.refuseRemoves = []
        w.secrets.refuseList = true
        let listMark = w.events.all.count
        XCTAssertThrowsError(try w.store.forget())
        XCTAssertEqual(Array(w.events.all.dropFirst(listMark)), [], "a forget with no list touched something")
        w.secrets.refuseList = false

        let before = w.events.all.count
        try w.store.forget()
        let after = Array(w.events.all.dropFirst(before))
        let lastRemove = try XCTUnwrap(after.lastIndex { $0.hasPrefix("remove ") })
        let firstDelete = try XCTUnwrap(after.firstIndex { $0.hasPrefix("delete ") })
        XCTAssertLessThan(lastRemove, firstDelete, "a key went before every record")
        XCTAssertTrue(w.secrets.isEmpty)
        XCTAssertEqual(w.keys.held, [])
    }

    // MARK: Rule 6, the sweep

    /// The sweep deletes every client key no record names, and none a record
    /// names, even a record that does not read back whole (its key goes at
    /// the next launch, once `loadAll` has removed it).
    func testTheSweepDeletesOnlyOrphans() throws {
        let w = world()
        let a = try mac("studio", w, pairedAt: 1)
        let b = try mac("laptop", w, pairedAt: 2)
        try w.store.save(a)
        let other = try w.store.save(b)
        let orphan = try w.keys.mint()
        let another = try w.keys.mint()
        var record = try XCTUnwrap(JSONSerialization.jsonObject(with: try XCTUnwrap(w.secrets.item(other))) as? [String: Any])
        record["port"] = 8823
        try w.secrets.write(try JSONSerialization.data(withJSONObject: record), account: other)
        w.store.sweepOrphans()
        XCTAssertEqual(Set(w.keys.deleted), [orphan.tag, another.tag])
        XCTAssertEqual(Set(w.keys.held), [a.clientKey.tag, b.clientKey.tag])

        _ = w.store.loadAll()
        XCTAssertNil(w.secrets.item(other))
        w.store.sweepOrphans()
        XCTAssertEqual(w.keys.held, [a.clientKey.tag], "the removed record's key outlived the next sweep")
        XCTAssertEqual(w.secrets.held, [PairingStore.account], "the sweep removed a record")
    }

    /// D11's guard: on ANY list or read error the sweep deletes nothing.
    func testTheSweepDeletesNothingAfterAnyReadError() throws {
        for failure in ["list", "first", "other"] {
            let w = world()
            try w.store.save(try mac("studio", w, pairedAt: 1))
            let other = try w.store.save(try mac("laptop", w, pairedAt: 2))
            _ = try w.keys.mint()
            switch failure {
            case "list": w.secrets.refuseList = true
            case "first": w.secrets.refuseReads = [PairingStore.account]
            default: w.secrets.refuseReads = [other]
            }
            w.store.sweepOrphans()
            XCTAssertEqual(w.keys.deleted, [], "the sweep deleted a key after a failed read (\(failure))")
            XCTAssertEqual(w.keys.held.count, 3)
        }
        let empty = world()
        empty.secrets.refuseList = true
        _ = try empty.keys.mint()
        empty.store.sweepOrphans()
        XCTAssertEqual(empty.keys.held.count, 1, "a list that failed read as no record")
    }

    // MARK: Held

    /// `holdsRecord(name:)` and `holdsRecord` answer true when a record
    /// reads back OR the list or a read throws; another Mac's record is not
    /// this one's.
    func testARecordThatCannotBeReadIsHeld() throws {
        let w = world()
        XCTAssertFalse(w.store.holdsRecord)
        let a = try mac("studio", w, pairedAt: 1)
        try w.store.save(a)
        XCTAssertTrue(w.store.holdsRecord(name: a.endpoint.name))
        XCTAssertFalse(w.store.holdsRecord(name: name("laptop")))
        w.secrets.refuseList = true
        XCTAssertTrue(w.store.holdsRecord(name: name("laptop")))
        XCTAssertTrue(w.store.holdsRecord)
        w.secrets.refuseList = false
        w.secrets.refuseReads = [PairingStore.account]
        XCTAssertTrue(w.store.holdsRecord(name: name("laptop")))
        XCTAssertTrue(w.store.holdsRecord)
    }
}
