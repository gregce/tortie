// Settings: the paired Mac, what iOS allows for alerts, the version, and
// Unpair this iPhone (Phase 316.6, build/p3166/SPEC.md section 5.3).
//
// docs/design/phone/Settings.html, frame for frame: house cards under the
// screen's own title, not a system list, so the frames are the mock's. Unpair's
// question is docs/design/phone/Unpair.html.
//
// IT READS NOTHING FROM THE DOOR. Everything here is the pairing the app
// already holds in memory (`DoorReading.facts`, public fields only), the list's
// last answer (its `read 4:32 PM`), what iOS allows (asked by the app, behind
// the pairing's own `macSends`, App/TortieApp.swift), and the app's own bundle.
//
// WHAT IT NEVER SAYS. The Alerts card is drawn only for a Mac that said it can
// send (Phase 316.5's `sends`), and it says what iOS allows, never that alerts
// are "on": the phone cannot see the Mac's switch. Its row opens iOS Settings
// at Tortie's notifications, a system constant, and it is the one address this
// file ever opens itself. There is no Face ID switch (his ruling of
// 2026-09-30: End always asks, and a switch before End exists is "dormant").
//
// ABOUT (Phase 333.1, build/p3331/SPEC.md D22) adds three rows under the
// version: Tortie for Mac (tortie.sh), Privacy and Support. Each press is a
// named method that hands a `SiteLink` to the site opener (Markdown/Links.swift),
// which asks the link policy and opens it; this file opens no page itself.
//
// UNPAIR forgets the pairing on this iPhone only. The Mac keeps listing the
// phone until he presses Remove there; its half is Phase 317's, and the
// question says so in the Mac's own words.

import SwiftUI
import UIKit

// MARK: - What Settings draws, decided before anything is laid out

/// The whole screen, as drawn. Pure, so the tests read every line of it with
/// nothing on screen.
struct SettingsDrawing: Equatable {
    /// The paired Mac, or nil when no pairing is held.
    let facts: PairedFacts?
    /// `read 4:32 PM` from the list's last loaded answer, or nil.
    let readLine: String?
    /// `Paired · Sep 30, 2026`, or nil.
    let pairedLine: String?
    /// What iOS allows, or nil when the Alerts card is NOT drawn, which is
    /// for every pairing whose Mac did not say it could send.
    let notificationsState: String?
    /// `Pair again to get alerts.` when the list says it, inside the Alerts
    /// card; never without the card.
    let alertsLine: String?
    /// The sentence under Unpair when the phone could not forget, or nil.
    let unpairLine: String?
    /// `1.0.0 (4)`.
    let version: String

    init(
        facts: PairedFacts?,
        list: ListState?,
        alertsLine: String?,
        permission: PushAuthorization?,
        settingsLine: String?,
        info: [String: Any]?,
        date: (Double) -> String = PairedClock.date
    ) {
        self.facts = facts
        if case .loaded(let drawing)? = list {
            readLine = drawing.readLine
        } else {
            readLine = nil
        }
        pairedLine = facts.map { Copy.joined([Copy.paired, date($0.pairedAt)]) }
        let sends = facts?.macSends ?? false
        notificationsState = sends ? Self.permissionWord(permission) : nil
        self.alertsLine = sends ? alertsLine : nil
        unpairLine = settingsLine
        version = AppVersion.line(info)
    }

    /// What iOS allows, in the phone's own words; a dash before it is read.
    static func permissionWord(_ permission: PushAuthorization?) -> String {
        switch permission {
        case .authorized: Copy.notificationsAllowed
        case .denied: Copy.notificationsOff
        case .notDetermined: Copy.notificationsNotAsked
        case nil: Copy.dash
        }
    }
}

/// The app's own version and build, from its bundle: `1.0.0 (4)`, a dash for
/// either one the bundle does not say.
enum AppVersion {
    static let marketingKey = "CFBundleShortVersionString"
    static let buildKey = "CFBundleVersion"

    static func line(_ info: [String: Any]?) -> String {
        let marketing = info?[marketingKey] as? String
        let build = info?[buildKey] as? String
        return Copy.versionLine(nonEmpty(marketing) ?? Copy.dash, nonEmpty(build) ?? Copy.dash)
    }

    private static func nonEmpty(_ text: String?) -> String? {
        guard let text, !text.isEmpty else { return nil }
        return text
    }
}

/// The day this iPhone paired, in the phone's own date format, no time: a
/// moment, not an age, so nothing is subtracted.
enum PairedClock {
    static func date(_ epochMs: Double) -> String {
        Date(timeIntervalSince1970: epochMs / 1000).formatted(date: .abbreviated, time: .omitted)
    }
}

// MARK: - The screen

struct SettingsScreen: View {
    let app: AppModel
    /// Tortie's own site. The app hands `SiteOpener`; a test hands its own.
    let site: any SiteOpening
    /// Unpair's question is up.
    @State private var asking = false

    init(app: AppModel, site: any SiteOpening = SiteOpener()) {
        self.app = app
        self.site = site
    }

    private var drawing: SettingsDrawing {
        SettingsDrawing(
            facts: app.reader?.facts,
            list: app.list?.state,
            alertsLine: app.list?.alertsLine,
            permission: app.alertPermission,
            settingsLine: app.settingsLine,
            info: Bundle.main.infoDictionary
        )
    }

    var body: some View {
        let drawing = drawing
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                title
                if let facts = drawing.facts {
                    macCard(facts, drawing: drawing)
                }
                if let state = drawing.notificationsState {
                    alertsCard(state: state, line: drawing.alertsLine)
                }
                unpairRow
                if let line = drawing.unpairLine {
                    Words(line, .secondary, Tokens.textSecondary, lines: nil)
                        .accessibilityIdentifier(ID.settingsUnpairLine)
                        .padding(.horizontal, Frame.gutter)
                        .padding(.top, 8)
                }
                aboutCard(drawing.version)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, Frame.gutter)
        }
        .scrollIndicators(.hidden)
        .background(Tokens.bgSidebar.ignoresSafeArea())
        .task { await app.readAlertPermission() }
        .confirmationDialog(Copy.unpairQuestion, isPresented: $asking, titleVisibility: .visible) {
            Button(Copy.unpair, role: .destructive) { app.unpair() }
            Button(Copy.cancel, role: .cancel) {}
        } message: {
            Text(verbatim: Copy.unpairNote)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.settingsScreen)
        .navigationTitle(Copy.settings)
        .toolbar(.hidden, for: .navigationBar)
    }

    /// `Settings`, 28/34 semibold, `padding: 0 16px 8px`, as the list's title.
    private var title: some View {
        Words(Copy.settings, .title, Tokens.textPrimary)
            .lineBox(.title)
            .accessibilityAddTraits(.isHeader)
            .accessibilityIdentifier(ID.settingsTitle)
            .padding(.horizontal, Frame.gutter)
            .padding(.bottom, 8)
    }

    /// This Mac: its name, its public name and port in monospace, when the
    /// list last read, the fingerprint exactly as Pairing drew it, and the day
    /// it paired (Settings.html's first card, `margin: 0 16px`).
    private func macCard(_ facts: PairedFacts, drawing: SettingsDrawing) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            RaisedLabel(Copy.thisMac)
            Words(facts.name, .lead, Tokens.textPrimary)
                .lineBox(.lead)
                .accessibilityIdentifier(ID.settingsMacName)
                .padding(.top, 6)
            Text(verbatim: facts.address)
                .font(.system(size: Face.secondary.size, design: .monospaced))
                .foregroundStyle(Tokens.textSecondary)
                .lineLimit(1)
                .truncationMode(.middle)
                .lineBox(.secondary)
                .accessibilityIdentifier(ID.settingsMacAddress)
                .padding(.top, 2)
            if let read = drawing.readLine {
                Words(read, .age, Tokens.textMuted)
                    .lineBox(.age)
                    .accessibilityIdentifier(ID.settingsMacRead)
                    .padding(.top, 2)
            }
            RaisedLabel(Copy.pairMatchLabel)
                .accessibilityIdentifier(ID.settingsMatch)
                .padding(.top, 16)
            Text(verbatim: facts.fingerprint)
                .font(.system(size: Face.fingerprint.size, design: .monospaced))
                .monospacedDigit()
                .foregroundStyle(Tokens.textPrimary)
                .lineSpacing(Face.fingerprint.spacing)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityIdentifier(ID.settingsFingerprint)
                .padding(.top, 6)
            if let paired = drawing.pairedLine {
                Words(paired, .small, Tokens.textMuted, lines: nil)
                    .accessibilityIdentifier(ID.settingsPaired)
                    .padding(.top, 8)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Frame.cardPadding)
        .card()
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.settingsMac)
        .padding(.horizontal, Frame.gutter)
    }

    /// Alerts: one 44-tall row saying what iOS allows, which opens iOS
    /// Settings, and `Pair again to get alerts.` under it when the list says
    /// so (`padding-top: 12px; padding-bottom: 4px`).
    private func alertsCard(state: String, line: String?) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            RaisedLabel(Copy.alerts)
            HStack(spacing: Frame.rowGap) {
                Words(Copy.notifications, .body, Tokens.textPrimary)
                    .lineBox(.body)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Words(state, .body, Tokens.textSecondary)
                    .lineBox(.body)
                    .fixedSize()
                    .accessibilityIdentifier(ID.settingsNotificationsState)
                Chevron()
            }
            .frame(minHeight: SettingsFrame.lineHeight)
            .contentShape(Rectangle())
            .onTapGesture(perform: openNotificationSettings)
            .accessibilityElement(children: .contain)
            .accessibilityAddTraits(.isButton)
            .accessibilityIdentifier(ID.settingsNotifications)
            .accessibilityAction(.default, openNotificationSettings)
            if let line {
                Words(line, .secondary, Tokens.textSecondary, lines: nil)
                    .accessibilityIdentifier(ID.settingsAlertsLine)
                    .padding(.bottom, 8)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, Frame.cardPadding)
        .padding(.top, SettingsFrame.listCardTop)
        .padding(.bottom, SettingsFrame.listCardBottom)
        .card()
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.settingsAlerts)
        .padding(.top, Frame.cardGap)
        .padding(.horizontal, Frame.gutter)
    }

    /// Unpair this iPhone: a 54-tall card row in the error colour, left
    /// aligned, which asks first.
    private var unpairRow: some View {
        Button {
            asking = true
        } label: {
            Words(Copy.unpairThisIPhone, .body, Tokens.error)
                .lineBox(.body)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, Frame.cardPadding)
                .frame(height: Frame.linkRowHeight)
                .contentShape(Rectangle())
                .card()
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(ID.settingsUnpair)
        .padding(.top, Frame.cardGap)
        .padding(.horizontal, Frame.gutter)
    }

    /// About: the app's version and build, then the three pages of Tortie's
    /// own site, each a row at least 44 tall (Phase 333.1, D22).
    private func aboutCard(_ version: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            RaisedLabel(Copy.about)
            HStack(spacing: Frame.rowGap) {
                Words(Copy.version, .body, Tokens.textPrimary)
                    .lineBox(.body)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Words(version, SettingsFrame.versionFace, Tokens.textSecondary)
                    .lineBox(SettingsFrame.versionFace)
                    .fixedSize()
                    .accessibilityIdentifier(ID.settingsVersion)
            }
            .frame(minHeight: SettingsFrame.lineHeight)
            Hairline()
            Button(action: openMacSite) {
                siteRow(Copy.macOnSite) {
                    Words(Copy.siteName, .body, Tokens.textSecondary)
                        .lineBox(.body)
                        .fixedSize()
                        .accessibilityIdentifier(ID.settingsMacSiteName)
                }
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier(ID.settingsMacSite)
            Hairline()
            Button(action: openPrivacy) {
                siteRow(Copy.privacy) { EmptyView() }
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier(ID.settingsPrivacy)
            Hairline()
            Button(action: openSupport) {
                siteRow(Copy.support) { EmptyView() }
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier(ID.settingsSupport)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, Frame.cardPadding)
        .padding(.top, SettingsFrame.listCardTop)
        .padding(.bottom, SettingsFrame.listCardBottom)
        .card()
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.settingsAbout)
        .padding(.top, Frame.cardGap)
        .padding(.horizontal, Frame.gutter)
    }

    /// One of About's site rows: its words, what it says on the right, and
    /// the chevron of a row that opens something.
    private func siteRow(_ words: String, @ViewBuilder trailing: () -> some View) -> some View {
        HStack(spacing: Frame.rowGap) {
            Words(words, .body, Tokens.textPrimary)
                .lineBox(.body)
                .frame(maxWidth: .infinity, alignment: .leading)
            trailing()
            Chevron()
        }
        .frame(minHeight: SettingsFrame.lineHeight)
        .contentShape(Rectangle())
    }

    // MARK: Tortie's own site, one named press each (D21)

    /// Tortie for Mac: the Mac app's page.
    func openMacSite() {
        site.open(.home)
    }

    /// Privacy.
    func openPrivacy() {
        site.open(.privacy)
    }

    /// Support.
    func openSupport() {
        site.open(.support)
    }

    /// iOS Settings, at Tortie's notifications: a system constant, never an
    /// address anyone wrote, and the only address this screen opens itself.
    private func openNotificationSettings() {
        guard let url = URL(string: UIApplication.openNotificationSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}

/// The lengths Settings.html spells that the other mocks do not.
private enum SettingsFrame {
    /// A row inside a card (`.line { min-height: 44px }`).
    static let lineHeight: CGFloat = 44
    /// A card that holds rows (`padding-top: 12px; padding-bottom: 4px`).
    static let listCardTop: CGFloat = 12
    static let listCardBottom: CGFloat = 4
    /// `1.0.0 (4)`: 17/22, tabular.
    static let versionFace = Face(17, line: 22, tabular: true)
}
