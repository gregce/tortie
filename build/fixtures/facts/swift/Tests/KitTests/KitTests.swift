import XCTest
import Testing
@testable import Kit

final class KitTests: XCTestCase {
    func testA() {
        XCTAssertTrue(true)
    }

    func testB() {
        let fileURL = URL(string: "https://example.com/image.jpg")!
        XCTAssertNotNil(fileURL)
    }
}

@Test func c() {
    #expect(true)
}
