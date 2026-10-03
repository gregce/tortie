import XCTest
@testable import Tortie

/// The one way out of the app (Phase 316.6, build/p3166/SPEC.md §5.5.5): which
/// addresses `LinkPolicy` lets the phone hand to the system, and which links
/// an answer may press. Each test names the clause it holds and fails when
/// that clause is taken out of Markdown/Links.swift or Markdown/Inline.swift.
final class MarkdownLinkTests: XCTestCase {
    private func url(_ text: String, file: StaticString = #filePath, line: UInt = #line) throws -> URL {
        try XCTUnwrap(URL(string: text), text, file: file, line: line)
    }

    /// The addresses an answer's runs keep as links, after the policy.
    static func links(_ markdown: String) -> [String] {
        var out: [String] = []
        for segment in Inline.render(markdown).segments {
            guard case .text(let words) = segment else { continue }
            for (link, _) in words.runs[AttributeScopes.FoundationAttributes.LinkAttribute.self] {
                if let link { out.append(link.absoluteString) }
            }
        }
        return out
    }

    // MARK: - opens

    /// Clause: a plain `https` address with a host of ASCII labels opens.
    func testPlainHTTPSAddressesOpen() throws {
        for text in [
            "https://apple.com",
            "https://apple.com/",
            "https://evil.example/x",
            "https://a-b.p3166.example/path/to?q=1&r=two#part",
            "https://sub.domain.co.uk/a_b/c~d"
        ] {
            XCTAssertTrue(LinkPolicy.opens(try url(text)), text)
        }
    }

    /// Clause: `https` only, written in lower case. Every other scheme starts
    /// nothing, the ones that would start something else on the phone first.
    func testOnlyLowerCaseHTTPSOpens() throws {
        for text in [
            "http://apple.com/",
            "HTTPS://apple.com/",
            "Https://apple.com/",
            "javascript:alert(1)",
            "data:text/html,hi",
            "file:///etc/hosts",
            "shortcuts://run-shortcut?name=x",
            "tel:5551234",
            "sms:5551234",
            "mailto:someone@p3166.example",
            "facetime:someone@p3166.example",
            "prefs:root=General",
            "app-settings:",
            "itms-services://?action=download-manifest&url=https://p3166.example/m.plist",
            "itms-apps://apps.apple.com/app/id1",
            "maps://?q=home",
            "tortie://open",
            "ftp://p3166.example/x"
        ] {
            XCTAssertFalse(LinkPolicy.opens(try url(text)), text)
        }
    }

    /// Clause: no user, no password and no port. The user-part trick puts
    /// the address a person reads before an `@`.
    func testNoUserPasswordOrPort() throws {
        for text in [
            "https://apple.com@evil.example/",
            "https://user@apple.com/",
            "https://user:pw@apple.com/",
            "https://:pw@apple.com/",
            "https://apple.com:443/",
            "https://apple.com:8443/x"
        ] {
            XCTAssertFalse(LinkPolicy.opens(try url(text)), text)
        }
    }

    /// Clause: the host is two or more labels of ASCII letters, digits and
    /// hyphens, none at a label's end, none punycode, the last holding a
    /// letter: no IP address, no single-label name, no underscore.
    func testOnlyAPlainHostOpens() throws {
        for text in [
            "https://127.0.0.1/",
            "https://10.0.0.1:9/x",
            "https://[::1]/",
            "https://localhost/",
            "https://intranet/",
            "https://a_b.p3166.example/",
            "https://-apple.com/",
            "https://apple-.com/",
            "https://apple..com/",
            "https://apple.com./",
            "https://xn--pple-43d.com/",
            "https://XN--pple-43d.com/",
            "https://apple.123/",
            "https://" + String(repeating: "a", count: 64) + ".com/"
        ] {
            XCTAssertFalse(LinkPolicy.opens(try url(text)), text)
        }
        XCTAssertTrue(LinkPolicy.opens(try url("https://" + String(repeating: "a", count: 63) + ".com/")))
    }

    /// Clause (the fix round): a last label the URL Standard reads as a
    /// number opens nothing. WebKit reads `https://127.0.0.0x1/` as 127.0.0.1
    /// and `https://192.168.1.0x1/` as 192.168.1.1, and the first build let
    /// both through because `x` is a letter.
    func testAHexLastLabelIsANumber() throws {
        for text in [
            "https://192.168.1.0x1/",
            "https://127.0.0.0x1/",
            "https://10.0.0.0xa/",
            "https://1.0x1/",
            "https://0x7f.0x0.0x0.0x1/",
            "https://p3166.0X1F/",
            "https://p3166.0x/"
        ] {
            XCTAssertFalse(LinkPolicy.opens(try url(text)), text)
        }
        // A label that only begins `0x` is a name, as the URL Standard says.
        XCTAssertTrue(LinkPolicy.opens(try url("https://p3166.0xygen/")))
    }

    /// Clause (the fix round): a name kept for one private network (RFC 6762
    /// and its Appendix G, RFC 8375, ICANN's `internal`, the hosts file's
    /// `localdomain`) opens nothing, whatever case it is written in.
    func testANameKeptForOneNetworkOpensNothing() throws {
        for text in [
            "https://localhost.localdomain/",
            "https://p3166.local/",
            "https://p3166.LOCAL/",
            "https://p3166.internal/",
            "https://router.lan/",
            "https://nas.home/",
            "https://p3166.home.arpa/",
            "https://1.0.0.127.in-addr.arpa/",
            "https://p3166.corp/",
            "https://p3166.intranet/",
            "https://p3166.private/"
        ] {
            XCTAssertFalse(LinkPolicy.opens(try url(text)), text)
        }
        // Only the LAST label decides: a public name may hold the word.
        XCTAssertTrue(LinkPolicy.opens(try url("https://local.p3166.example/")))
    }

    /// Clause: an empty host opens nothing.
    func testAnEmptyHostOpensNothing() {
        for text in ["https:///", "https://", "https:/x"] {
            if let url = URL(string: text) { XCTAssertFalse(LinkPolicy.opens(url), text) }
        }
    }

    /// Clause: printable ASCII of at most `MarkdownCaps.linkBytes` bytes,
    /// 2,048 opening and 2,049 not.
    func testTheAddressCap() throws {
        let head = "https://p3166.example/"
        let atCap = head + String(repeating: "a", count: MarkdownCaps.linkBytes - head.utf8.count)
        XCTAssertEqual(atCap.utf8.count, 2_048)
        XCTAssertTrue(LinkPolicy.opens(try url(atCap)))
        XCTAssertFalse(LinkPolicy.opens(try url(atCap + "a")))
    }

    /// Two clauses no URL Foundation makes can reach alone, kept as defence
    /// in depth (rule (z), clause z6, names the password): a password always
    /// comes with a user, empty or not, which the user clause refuses first;
    /// and every address Foundation makes is percent-encoded printable ASCII,
    /// which the ASCII clause asks again. This pins both facts, so a
    /// Foundation that changed either would turn it red, and the clause would
    /// then be the one standing.
    func testTheClausesNoURLReachesAlone() throws {
        XCTAssertEqual(try url("https://:pw@apple.com/").user, "")
        XCTAssertFalse(LinkPolicy.opens(try url("https://:pw@apple.com/")))
        for text in ["https://apple.com/\u{E9}", "https://apple.com/a b", "https://apple.com/{x}", "https://apple.com/\u{7F}", "https://apple.com/\u{202E}x"] {
            guard let made = URL(string: text) else { continue }
            XCTAssertTrue(made.absoluteString.utf8.allSatisfy { $0 >= 0x21 && $0 <= 0x7e }, made.absoluteString)
        }
        // Not even from raw bytes, the one initialiser that takes them
        // unchecked (the fix round's own probe on macOS 15.6: each comes back
        // percent-encoded), which is why the attack verifier's ablation of the
        // ASCII clause stayed green: the clause stands only if this goes red.
        for bytes in [Array("https://p3166.example/caf\u{E9}".utf8), Array("https://p3166.example/a b".utf8), Array("https://a.p3166.example/".utf8) + [0x01, 0x7f]] {
            guard let made = URL(dataRepresentation: Data(bytes), relativeTo: nil, isAbsolute: true) else { continue }
            XCTAssertTrue(made.absoluteString.utf8.allSatisfy { $0 >= 0x21 && $0 <= 0x7e }, made.absoluteString)
        }
    }

    // MARK: - pressable, through the parse

    /// Clause: a link's words never decide where it goes. The lying link is
    /// pressable, and its address is the one the alert will show.
    func testTheLyingLinkGoesWhereItsAddressSays() {
        XCTAssertEqual(Self.links("[https://apple.com](https://evil.example/x)"), ["https://evil.example/x"])
        XCTAssertEqual(Self.links("see [the pull request](https://p3166.example/pr/1)."), ["https://p3166.example/pr/1"])
    }

    /// Clause: a link whose words are its address is never pressable: a bare
    /// URL, an autolink and `www.`, which Foundation makes links of.
    func testABareAddressIsNeverPressable() {
        XCTAssertEqual(Self.links("see https://apple.com and https://apple.com/"), [])
        XCTAssertEqual(Self.links("<https://apple.com>"), [])
        XCTAssertEqual(Self.links("www.apple.com"), [])
        XCTAssertEqual(Self.links("[apple.com/](https://apple.com)"), [])
        XCTAssertEqual(Self.links("[https://apple.com/](https://apple.com)"), [])
        // The words survive whatever happens to the address.
        XCTAssertEqual(Inline.render("see https://apple.com").plain, "see https://apple.com")
        XCTAssertEqual(Inline.render("[apple.com/](https://apple.com)").plain, "apple.com/")
    }

    /// Clause (the fix round): words that already SAY the address, however
    /// they are written, are not pressable: a bare address whose encoded form
    /// differs from its words (`café`, which Foundation encodes), a bare
    /// address Foundation ran together with a link beside it, an address in a
    /// bidi isolate, and one written with a full-width dot. The first build
    /// compared the words with the address byte for byte, and pressed them.
    func testWordsThatSayTheAddressAreNotPressable() {
        XCTAssertEqual(Self.links("see https://p3166.example/caf\u{E9}"), [])
        XCTAssertEqual(Self.links("see https://p3166.example/caf\u{E9}/"), [])
        XCTAssertEqual(Self.links("https://p3166.example/x[!](https://p3166.example/x) and [https://p3166.example/y](https://p3166.example/y)[.](https://p3166.example/y)"), [])
        XCTAssertEqual(Self.links("[\u{2067}https://p3166.example/same\u{2069}](https://p3166.example/same)"), [])
        XCTAssertEqual(Self.links("[https://p3166\u{FF0E}example/z](https://p3166.example/z)"), [])
        XCTAssertEqual(Self.links("[HTTPS://P3166.EXAMPLE/w](https://p3166.example/w)"), [])
        // Words that are another address still lie, and the alert says where.
        XCTAssertEqual(Self.links("[https://p3166.example/safe](https://p3166.example/other)"), ["https://p3166.example/other"])
        XCTAssertEqual(Self.links("[the change](https://p3166.example/caf%C3%A9)"), ["https://p3166.example/caf%C3%A9"])
    }

    /// Clause: every refused address leaves its words and no link.
    func testARefusedLinkIsItsWords() {
        let drawn = Inline.render("[run it](shortcuts://run-shortcut?name=x) and [call](tel:5551234) and [mine](https://127.0.0.1:9/x)")
        XCTAssertEqual(drawn.plain, "run it and call and mine")
        XCTAssertEqual(Self.links("[run it](shortcuts://run-shortcut?name=x) and [call](tel:5551234) and [mine](https://127.0.0.1:9/x)"), [])
        XCTAssertEqual(Self.links("[in](https://apple.com@evil.example/)"), [])
    }

    /// Clause: a zero-width space in a host is dropped by Foundation, so what
    /// opens is what the alert shows (the spec's §3 row 13).
    func testAZeroWidthHostReadsAsItsLetters() {
        XCTAssertEqual(Self.links("[x](https://app\u{200B}le.com/)"), ["https://apple.com/"])
    }

    /// Clause: an internationalised host comes back as punycode and is refused.
    func testAnIDNHostIsRefused() {
        XCTAssertEqual(Self.links("[apple](https://\u{0430}pple.com/)"), [])
        XCTAssertEqual(Inline.render("[apple](https://\u{0430}pple.com/)").plain, "apple")
    }

    /// Clause: an address over the cap is not pressable, through the parse.
    func testALongLinkThroughTheParse() {
        let head = "https://p3166.example/"
        let atCap = head + String(repeating: "b", count: 2_048 - head.utf8.count)
        XCTAssertEqual(Self.links("[long](" + atCap + ")"), [atCap])
        XCTAssertEqual(Self.links("[long](" + atCap + "b)"), [])
    }

    /// Clause: an image is its words and never a link or an address.
    func testAnImageInsideALinkIsTheLinksWords() {
        let drawn = Inline.render("[![shot](https://127.0.0.1:9/a.png)](https://p3166.example/a)")
        XCTAssertFalse(drawn.plain.contains("127.0.0.1"))
        for segment in drawn.segments {
            guard case .text(let words) = segment else { continue }
            for (image, _) in words.runs[AttributeScopes.FoundationAttributes.ImageURLAttribute.self] {
                XCTAssertNil(image)
            }
        }
    }
}
