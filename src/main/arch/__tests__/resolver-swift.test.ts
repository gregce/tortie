/**
 * The Swift arm at TARGET grain, through the real grammar (Phase 180).
 *
 * Package.swift here is PARSED BY THE VENDORED SWIFT WASM, the same grammar
 * the palette reads .swift files with, so what these tests prove is the
 * shipped path and not a lookalike lexer. The hostile block is the charter's
 * own attack: a manifest whose targets are computed, a target that claims
 * files it does not own, and an import naming a target that does not exist
 * must refuse or answer unresolved, never invent an edge.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archResolveContext, resolveImport } from '../resolver';
import { readArchManifests, type ArchManifests } from '../resolver/manifest';
import { swiftTargetName } from '../resolver/swift';
import { readSwiftManifest } from '../resolver/swiftpm';

let root: string;

const PACKAGE_SWIFT = `// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Core",
    platforms: [
        .macOS(.v14),
    ],
    products: [
        .library(name: "Core", targets: ["Core"]),
    ],
    dependencies: [
        .package(url: "https://github.com/example/MarkdownView.git", branch: "main"),
    ],
    targets: [
        .target(
            name: "Core",
            dependencies: [
                .product(name: "MarkdownView", package: "MarkdownView"),
            ]
        ),
        .testTarget(
            name: "CoreTests",
            dependencies: ["Core"]
        ),
        .target(
            name: "Hollow",
            path: "Sources/Hollow"
        ),
    ]
)
`;

/**
 * A minimal but real pbxproj: one app target `App` whose sources sit in a
 * group tree, one test target `AppTests`, a local package product `Core` and
 * a remote one `Charty`.
 */
const PBXPROJ = `// !$*UTF8*$!
{
	objectVersion = 77;
	objects = {
		B1 = {isa = PBXBuildFile; fileRef = F1 /* Main.swift */; };
		B2 = {isa = PBXBuildFile; fileRef = F2 /* Helper.swift */; };
		B3 = {isa = PBXBuildFile; fileRef = F3 /* MainTests.swift */; };
		F1 = {isa = PBXFileReference; path = Main.swift; sourceTree = "<group>"; };
		F2 = {isa = PBXFileReference; path = Helper.swift; sourceTree = "<group>"; };
		F3 = {isa = PBXFileReference; path = MainTests.swift; sourceTree = "<group>"; };
		G0 = {isa = PBXGroup; children = (G1, G2, ); sourceTree = "<group>"; };
		G1 = {isa = PBXGroup; children = (F1, F2, ); path = Sources; sourceTree = "<group>"; };
		G2 = {isa = PBXGroup; children = (F3, ); path = Tests; sourceTree = "<group>"; };
		P1 = {isa = PBXProject; mainGroup = G0; projectDirPath = ""; targets = (T1, T2, ); };
		S1 = {isa = PBXSourcesBuildPhase; files = (B1, B2, ); };
		S2 = {isa = PBXSourcesBuildPhase; files = (B3, ); };
		T1 = {isa = PBXNativeTarget; buildPhases = (S1, ); name = App; packageProductDependencies = (X9, ); productName = App; };
		T2 = {isa = PBXNativeTarget; buildPhases = (S2, ); name = AppTests; productName = AppTests; };
		X9 = {isa = XCSwiftPackageProductDependency; productName = Core; };
		R1 = {isa = XCRemoteSwiftPackageReference; repositoryURL = "https://github.com/example/Charty.git"; };
	};
	rootObject = P1;
}
`.replaceAll('B1', 'AAAAAAAAAAAAAAAAAAAAAAA1')
  .replaceAll('B2', 'AAAAAAAAAAAAAAAAAAAAAAA2')
  .replaceAll('B3', 'AAAAAAAAAAAAAAAAAAAAAAA3')
  .replaceAll('F1', 'BBBBBBBBBBBBBBBBBBBBBBB1')
  .replaceAll('F2', 'BBBBBBBBBBBBBBBBBBBBBBB2')
  .replaceAll('F3', 'BBBBBBBBBBBBBBBBBBBBBBB3')
  .replaceAll('G0', 'CCCCCCCCCCCCCCCCCCCCCCC0')
  .replaceAll('G1', 'CCCCCCCCCCCCCCCCCCCCCCC1')
  .replaceAll('G2', 'CCCCCCCCCCCCCCCCCCCCCCC2')
  .replaceAll('P1', 'DDDDDDDDDDDDDDDDDDDDDDD1')
  .replaceAll('S1', 'EEEEEEEEEEEEEEEEEEEEEEE1')
  .replaceAll('S2', 'EEEEEEEEEEEEEEEEEEEEEEE2')
  .replaceAll('T1', 'FFFFFFFFFFFFFFFFFFFFFFF1')
  .replaceAll('T2', 'FFFFFFFFFFFFFFFFFFFFFFF2')
  .replaceAll('X9', 'ABCDEFABCDEFABCDEFABCDE1')
  .replaceAll('R1', 'ABCDEFABCDEFABCDEFABCDE2');

const FILES = [
  'kit/Package.swift',
  'kit/Sources/Core/A.swift',
  'kit/Sources/Core/B.swift',
  'kit/Tests/CoreTests/T.swift',
  'app/Rook.xcodeproj/project.pbxproj',
  'app/Sources/Main.swift',
  'app/Sources/Helper.swift',
  'app/Tests/MainTests.swift',
  'loose/Floating.swift'
];

let manifests: ArchManifests;

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'gmux-arch-swift-'));
  mkdirSync(join(root, 'kit'), { recursive: true });
  mkdirSync(join(root, 'app', 'Rook.xcodeproj'), { recursive: true });
  writeFileSync(join(root, 'kit', 'Package.swift'), PACKAGE_SWIFT);
  writeFileSync(
    join(root, 'app', 'Rook.xcodeproj', 'project.pbxproj'),
    PBXPROJ
  );
  manifests = readArchManifests(root);
  manifests.swift = await readSwiftManifest(root, FILES);
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function ctx(): ReturnType<typeof archResolveContext> {
  return archResolveContext(manifests, FILES);
}

describe('the Swift manifest reader', () => {
  it('extracts the literal targets, their paths and the declared packages', () => {
    const swift = manifests.swift;
    expect(swift.present).toBe(true);
    expect(swift.stopped).toEqual([]);
    const byName = new Map(swift.targets.map((t) => [t.name, t]));
    expect(byName.get('Core')?.dir).toBe('kit/Sources/Core');
    expect(byName.get('CoreTests')?.dir).toBe('kit/Tests/CoreTests');
    expect(byName.get('Hollow')?.dir).toBe('kit/Sources/Hollow');
    expect(swift.packages.has('MarkdownView')).toBe(true);
    expect(swift.packages.has('Charty')).toBe(true);
    // Core is a LOCAL target; the pbxproj's product dependency on it must
    // not leave it in the external set shadowing its own target.
    expect(swift.packages.has('Core')).toBe(false);
  });

  it('reads the pbxproj membership through the group tree', () => {
    const app = manifests.swift.targets.find((t) => t.name === 'App');
    expect(app?.files).toEqual(['app/Sources/Helper.swift', 'app/Sources/Main.swift']);
    const tests = manifests.swift.targets.find((t) => t.name === 'AppTests');
    expect(tests?.files).toEqual(['app/Tests/MainTests.swift']);
  });
});

describe('the Swift arm, at target grain', () => {
  it('assigns every file to its target by the manifest path rules', () => {
    const c = ctx();
    expect(swiftTargetName('kit/Sources/Core/A.swift', c)).toBe('Core');
    expect(swiftTargetName('kit/Tests/CoreTests/T.swift', c)).toBe('CoreTests');
    expect(swiftTargetName('app/Sources/Main.swift', c)).toBe('App');
    expect(swiftTargetName('app/Tests/MainTests.swift', c)).toBe('AppTests');
    expect(swiftTargetName('loose/Floating.swift', c)).toBeNull();
  });

  it('lands an import on the named target directory, never on a file', () => {
    expect(
      resolveImport('Core', 'kit/Tests/CoreTests/T.swift', 'swift', ctx())
    ).toEqual({ toPath: 'kit/Sources/Core', resolution: 'first-party' });
    // From the app too: the SPM target answers wherever the import is written.
    expect(
      resolveImport('Core', 'app/Sources/Main.swift', 'swift', ctx())
    ).toEqual({ toPath: 'kit/Sources/Core', resolution: 'first-party' });
  });

  it('resolves an Xcode target for its own tests', () => {
    expect(
      resolveImport('App', 'app/Tests/MainTests.swift', 'swift', ctx())
    ).toEqual({ toPath: 'app/Sources', resolution: 'first-party' });
  });

  it('scoped and submodule forms resolve by their module head', () => {
    const c = ctx();
    expect(resolveImport('UIKit.UIView', 'app/Sources/Main.swift', 'swift', c)).toEqual({
      toPath: null,
      resolution: 'external'
    });
  });

  it('answers external for the SDK and for declared packages', () => {
    const c = ctx();
    for (const specifier of ['Foundation', 'SwiftUI', 'XCTest', 'PackageDescription', 'MarkdownView', 'Charty']) {
      expect(resolveImport(specifier, 'app/Sources/Main.swift', 'swift', c)).toEqual({
        toPath: null,
        resolution: 'external'
      });
    }
  });

  it('answers unresolved for a target that owns no tracked file', () => {
    // Hollow is declared with a path that holds nothing. An edge to an empty
    // claim would be an invented edge.
    expect(
      resolveImport('Hollow', 'app/Sources/Main.swift', 'swift', ctx())
    ).toEqual({ toPath: null, resolution: 'unresolved' });
  });

  it('answers unresolved for a module found nowhere, never external', () => {
    const c = ctx();
    for (const specifier of ['NoSuchKit', 'Alamofire']) {
      expect(resolveImport(specifier, 'app/Sources/Main.swift', 'swift', c)).toEqual({
        toPath: null,
        resolution: 'unresolved'
      });
    }
  });

  it('refuses a specifier that is not a plain module path', () => {
    const c = ctx();
    for (const specifier of ['', '  ', 'A-B', 'A/B', '1Kit', 'Kit.']) {
      expect(resolveImport(specifier, 'app/Sources/Main.swift', 'swift', c)).toEqual({
        toPath: null,
        resolution: 'unresolved'
      });
    }
  });
});

describe('the hostile manifests, refused rather than guessed at', () => {
  it('stops a manifest whose targets are computed', async () => {
    const swift = await readSwiftManifest(
      root,
      ['Package.swift'],
      () => 'let package = Package(name: "X", targets: makeTargets())\n'
    );
    expect(swift.targets).toEqual([]);
    expect(swift.stopped).toEqual([
      {
        path: 'Package.swift',
        reason: 'The targets are computed rather than written as literals'
      }
    ]);
  });

  it('stops a manifest whose target list holds a computed element', async () => {
    const swift = await readSwiftManifest(
      root,
      ['Package.swift'],
      () =>
        'let package = Package(name: "X", targets: [.target(name: "A"), extra].compactMap { $0 })\n'
    );
    expect(swift.targets).toEqual([]);
    expect(swift.stopped.length).toBe(1);
  });

  it('stops a manifest whose target name is interpolated', async () => {
    const swift = await readSwiftManifest(
      root,
      ['Package.swift'],
      () => 'let suffix = "Kit"\nlet package = Package(name: "X", targets: [.target(name: "Core\\(suffix)")])\n'
    );
    expect(swift.targets).toEqual([]);
    expect(swift.stopped).toEqual([
      {
        path: 'Package.swift',
        reason: 'A target name is computed rather than written as a literal'
      }
    ]);
  });

  it('a stopped manifest leaves every non platform import unresolved', async () => {
    const stoppedManifests = {
      ...readArchManifests(root),
      swift: await readSwiftManifest(
        root,
        ['Package.swift'],
        () => 'let package = Package(name: "X", targets: makeTargets())\n'
      )
    };
    const c = archResolveContext(stoppedManifests, FILES);
    expect(resolveImport('Core', 'kit/Sources/Core/A.swift', 'swift', c)).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
    expect(resolveImport('Foundation', 'kit/Sources/Core/A.swift', 'swift', c)).toEqual({
      toPath: null,
      resolution: 'external'
    });
  });

  it('answers unresolved when a target wears an SDK module name', async () => {
    const twoWorlds = {
      ...readArchManifests(root),
      swift: await readSwiftManifest(
        root,
        ['Package.swift'],
        () => 'let package = Package(name: "X", targets: [.target(name: "Charts", path: "kit/Sources/Core")])\n'
      )
    };
    const c = archResolveContext(twoWorlds, FILES);
    expect(resolveImport('Charts', 'app/Sources/Main.swift', 'swift', c)).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
  });
});
