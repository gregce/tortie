import Foundation
import XCTest
@testable import Tortie

/// `writer` is a REQUIREMENT of `DoorReading` (Phase 317, build/p317/SPEC.md
/// section 5.8.6, finding 3). The app holds its reader as `any DoorReading`
/// (`AppModel.reader`, the tabs), and a member that lived only in a protocol
/// extension would be dispatched statically there and read nil, so the
/// shipping app would draw no End bar and no Select while every concretely
/// typed fake passed. Each test fails when `writer` is
/// taken out of the protocol's requirements in Screens/DoorWords.swift, or out
/// of `PairedReader`.
final class WriterTests: XCTestCase {
    /// Clause: a reader that writes answers its writer through the
    /// existential the app holds.
    func testAWritingReaderAnswersThroughTheExistential() {
        let writes = ScriptedWriter()
        let reader: any DoorReading = WritingReader(reads: ScriptedReader(), writes: writes)
        XCTAssertNotNil(reader.writer, "the writer was dispatched to the extension's nil")
        XCTAssertNotNil((WritingReader(reads: ScriptedReader(), writes: writes) as any DoorReading).writer)
    }

    /// Clause: a reader that writes nothing (every 316.6 fake) reads nil, so
    /// it draws no End and no Select.
    func testAReaderThatWritesNothingReadsNil() {
        XCTAssertNil((ScriptedReader() as any DoorReading).writer)
        XCTAssertNil((WritingReader(reads: ScriptedReader(), writes: nil) as any DoorReading).writer)
    }

    #if os(iOS)
    override func tearDown() {
        TestIdentity.removeFromKeychain()
    }

    /// Clause: the SHIPPING reader, typed as the app holds it, has a writer.
    func testThePairedReaderHasAWriterAsTheAppHoldsIt() throws {
        let v = try DoorVectorFile.load()
        let offer = try PairingOffer.parse(try XCTUnwrap(v.qr.first).payload)
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let keys = MemoryClientKeys(spki: v.keys.clientKey)
        let key = try keys.mint()
        let door = try XCTUnwrap(PairedDoor(
            endpoint: offer.door, macSigningKey: offer.macSigningKey, macExchangeKey: offer.macExchangeKey,
            label: "p317-phone-label", pairedAt: 1_759_190_400_000, keys: PhoneKeys.generate(), clientKey: key,
            certificate: certificate, identity: try keys.adopt(certificate, for: key),
            alerts: AlertsKept(macSends: false, presented: nil)
        ))
        let reader = PairedReader(client: DoorClient(transport: NameTransport()), door: door)
        XCTAssertNotNil((reader as any DoorReading).writer)
        let held: (any DoorReading)? = reader
        XCTAssertNotNil(held?.writer, "the app's optional existential reads the extension's nil")
    }
    #endif
}
