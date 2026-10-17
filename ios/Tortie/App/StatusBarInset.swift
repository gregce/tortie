// The status bar's inset, kept (Phase 333.4.1, build/p33341/SPEC.md D1 to D3).
//
// THE DEFECT, MEASURED (build/p33341/SPEC.md §2.1): on a Home-button iPhone on
// iOS 26.3 (the iPhone SE, 2nd and 3rd generation), a turn sideways and back
// leaves the WINDOW's own top safe-area inset at 0 while iOS draws its
// 20-point status bar again: before the turn the window reads 20 and the
// status bar [0, 0, 375, 20]; sideways 0 and hidden; upright again 0 and
// [0, 0, 375, 20], and it stays 0 after 5 s, Back and a tab switch. So the
// navigation bar sits at y 10 under the clock, and a view that keeps to the
// safe area (See a sample's bar) loses all 20 points, until the app is next
// launched. It happens in FIVE bare SwiftUI hierarchies with no Tortie view in
// them (a plain page, a NavigationStack, a TabView of NavigationStacks, the
// same with the Terminal's own bar and status bar hides, and a 44-point bar
// above the tabs), so it is iOS's, not the Terminal's. iOS 18.3, every Face ID
// iPhone and the iPad keep the inset.
//
// NOTHING PUBLIC ASKS IOS TO MEASURE IT AGAIN (D2): the status bar appearance
// and every view controller's layout asked again after the turn, the status
// bar asked visible sideways, a portrait geometry request and the status bar
// hidden for a moment after the turn were each measured on the SE at 26.3, and
// each left the window's inset at 0.
//
// SO THE APP'S ROOT MAKES UP EXACTLY WHAT THE WINDOW LACKS (D3): the
// difference between iOS's own two readings, the status bar's bottom and the
// window's own top inset, never below 0. No number in it is Tortie's: it is 0
// wherever iOS agrees with itself, which is every device but the one with the
// defect, and 20 points there; and a later iOS that restores the inset itself
// takes the difference back to 0 the moment it does. It is read when a size
// change COMPLETES (at its start the status bar still reads 0, measured), when
// the safe area moves and when the keeper appears; it acts on its own window's
// root alone (never every window of the scene, which holds the keyboard's) and
// writes the top edge alone.

import SwiftUI
import UIKit

enum StatusBarInset {
    /// What the window's own top inset lacks of the status bar's bottom, in
    /// points, never below 0.
    static func missing(statusBarBottom: CGFloat, windowTop: CGFloat) -> CGFloat {
        max(0, CGFloat(statusBarBottom) - windowTop)
    }
}

/// A child of the app's root with nothing to draw: it hears the window's size
/// changes and keeps the root's top inset at what the window lacks.
final class StatusBarInsetController: UIViewController {
    override func viewWillTransition(to size: CGSize, with coordinator: any UIViewControllerTransitionCoordinator) {
        super.viewWillTransition(to: size, with: coordinator)
        // At the transition's COMPLETION, never here: at its start the status
        // bar still reads 0 (build/p33341/SPEC.md §2.1).
        coordinator.animate(alongsideTransition: nil) { [weak self] _ in self?.keep() }
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        keep()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        keep()
    }

    /// The root's top inset set to what THIS window lacks, and only when it
    /// moves.
    func keep() {
        guard let window = view.window, let root = window.rootViewController else { return }
        let bar = window.windowScene?.statusBarManager?.statusBarFrame.maxY ?? 0
        let missing = StatusBarInset.missing(statusBarBottom: bar, windowTop: window.safeAreaInsets.top)
        if root.additionalSafeAreaInsets.top != missing {
            root.additionalSafeAreaInsets.top = missing
        }
    }
}

/// The keeper, placed once under the app's root view (`RootView`).
struct StatusBarInsetKeeper: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> StatusBarInsetController { StatusBarInsetController() }
    func updateUIViewController(_ controller: StatusBarInsetController, context: Context) {}
}
