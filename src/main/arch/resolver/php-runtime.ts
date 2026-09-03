/**
 * The class names PHP's own runtime puts in the GLOBAL namespace, which the
 * PHP arm answers `external` for (Phase 184).
 *
 * WHY A COMPILED IN LIST IS ALLOWED HERE when ./answers.ts binds every arm to
 * "the repository has to have said so". These are the platform, not a
 * dependency: no `composer.json` declares `Closure` or `RuntimeException` and
 * every PHP file may `use` one, exactly as the script arm answers `external`
 * out of Node's builtin list and the Swift arm out of ./apple-sdk.ts. The list
 * is checked AFTER the repository's own autoload map has had its chance at the
 * name, so a repository that autoloads its own global `Exception` wins.
 *
 * WHY IT IS NEEDED AT ALL, MEASURED. PHP has no namespaced standard library,
 * so the first build of the arm had no platform list and every one of these
 * names read as a miss: laravel showed 1,877 unresolved imports, and the top
 * thirteen of them were `Closure` at 244, `InvalidArgumentException` at 183,
 * `RuntimeException` at 174, `Exception` at 135 and `Throwable` at 112. That
 * is not a resolver finding nothing, it is a resolver with nothing to compare
 * against.
 *
 * ONLY A NAME WITH NO BACKSLASH IN IT IS EVER LOOKED UP HERE, because the
 * global namespace is exactly what a name with no backslash means.
 * `App\Exception` is a repository's own class and is never matched against
 * this list.
 *
 * THE LIMIT, STATED, and it is the same one ./apple-sdk.ts carries. This list
 * is HAND WRITTEN and known to be incomplete: PHP's extensions publish
 * hundreds of classes and this holds the core, SPL, reflection, date and the
 * extension classes real repositories `use`. A genuine runtime class missing
 * from it answers `unresolved`, which is grey and safe, never `external` by
 * guesswork, and adding a name here is a one line change a grey face makes
 * obvious. Nothing here can run: these are names compared against import
 * specifiers and they reach no argv.
 */

/** Global classes and interfaces the PHP runtime and its bundled extensions ship. */
export const PHP_RUNTIME_CLASSES: ReadonlySet<string> = new Set([
  // The language's own.
  'Closure', 'Generator', 'Fiber', 'WeakMap', 'WeakReference', 'stdClass',
  'Attribute', 'Stringable', 'Countable', 'ArrayAccess', 'Iterator',
  'IteratorAggregate', 'Traversable', 'JsonSerializable', 'Serializable',
  'UnitEnum', 'BackedEnum', 'Directory', 'php_user_filter', 'SensitiveParameter',
  'AllowDynamicProperties', 'ReturnTypeWillChange', 'Override',
  // Throwables, the language's and SPL's.
  'Throwable', 'Exception', 'Error', 'ErrorException', 'ArgumentCountError',
  'ArithmeticError', 'AssertionError', 'DivisionByZeroError', 'TypeError',
  'ValueError', 'UnhandledMatchError', 'JsonException',
  'BadFunctionCallException', 'BadMethodCallException', 'DomainException',
  'InvalidArgumentException', 'LengthException', 'LogicException',
  'OutOfBoundsException', 'OutOfRangeException', 'OverflowException',
  'RangeException', 'RuntimeException', 'UnderflowException',
  'UnexpectedValueException',
  // SPL containers and iterators.
  'ArrayObject', 'ArrayIterator', 'SplStack', 'SplQueue', 'SplDoublyLinkedList',
  'SplFixedArray', 'SplObjectStorage', 'SplPriorityQueue', 'SplHeap',
  'SplMinHeap', 'SplMaxHeap', 'SplSubject', 'SplObserver', 'SplFileInfo',
  'SplFileObject', 'SplTempFileObject', 'AppendIterator', 'CachingIterator',
  'CallbackFilterIterator', 'DirectoryIterator', 'EmptyIterator',
  'FilesystemIterator', 'FilterIterator', 'GlobIterator', 'InfiniteIterator',
  'IteratorIterator', 'LimitIterator', 'MultipleIterator', 'NoRewindIterator',
  'OuterIterator', 'RecursiveArrayIterator', 'RecursiveCallbackFilterIterator',
  'RecursiveDirectoryIterator', 'RecursiveFilterIterator', 'RecursiveIterator',
  'RecursiveIteratorIterator', 'RecursiveRegexIterator', 'RecursiveTreeIterator',
  'RegexIterator', 'SeekableIterator',
  // Reflection.
  'Reflector', 'ReflectionAttribute', 'ReflectionClass', 'ReflectionClassConstant',
  'ReflectionEnum', 'ReflectionEnumBackedCase', 'ReflectionEnumUnitCase',
  'ReflectionException', 'ReflectionExtension', 'ReflectionFunction',
  'ReflectionFunctionAbstract', 'ReflectionGenerator', 'ReflectionIntersectionType',
  'ReflectionMethod', 'ReflectionNamedType', 'ReflectionObject',
  'ReflectionParameter', 'ReflectionProperty', 'ReflectionType',
  'ReflectionUnionType', 'ReflectionZendExtension',
  // Dates.
  'DateTime', 'DateTimeImmutable', 'DateTimeInterface', 'DateTimeZone',
  'DateInterval', 'DatePeriod', 'DateError', 'DateException',
  // Bundled extensions real repositories reach for.
  'PDO', 'PDOStatement', 'PDOException', 'PDORow',
  'mysqli', 'mysqli_stmt', 'mysqli_result', 'mysqli_driver', 'mysqli_sql_exception',
  'SQLite3', 'SQLite3Stmt', 'SQLite3Result',
  'SimpleXMLElement', 'SimpleXMLIterator',
  'DOMDocument', 'DOMDocumentFragment', 'DOMElement', 'DOMNode', 'DOMNodeList',
  'DOMText', 'DOMAttr', 'DOMComment', 'DOMXPath', 'DOMException',
  'XMLReader', 'XMLWriter', 'XSLTProcessor',
  'ZipArchive', 'Phar', 'PharData', 'PharFileInfo',
  'SoapClient', 'SoapServer', 'SoapFault', 'SoapHeader', 'SoapParam', 'SoapVar',
  'SessionHandler', 'SessionHandlerInterface', 'SessionIdInterface',
  'SessionUpdateTimestampHandlerInterface',
  'CurlHandle', 'CurlMultiHandle', 'CurlShareHandle',
  'OpenSSLAsymmetricKey', 'OpenSSLCertificate', 'OpenSSLCertificateSigningRequest',
  'Socket', 'AddressInfo', 'GMP', 'Collator', 'NumberFormatter',
  'IntlDateFormatter', 'IntlCalendar', 'IntlTimeZone', 'IntlBreakIterator',
  'IntlChar', 'IntlException', 'Locale', 'MessageFormatter', 'Normalizer',
  'ResourceBundle', 'Transliterator', 'UConverter', 'Spoofchecker',
  'FFI', 'Redis', 'RedisCluster', 'Memcached', 'Memcache',
  'InflateContext', 'DeflateContext', 'FinfoDb', 'finfo',
  'RedisException', 'RedisClusterException'
]);
