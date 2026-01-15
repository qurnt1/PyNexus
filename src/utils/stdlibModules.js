/**
 * Python Standard Library Modules (Python 3.x)
 * Used to differentiate stdlib from third-party packages
 */

export const STDLIB_MODULES = new Set([
    // Text Processing
    'string', 're', 'difflib', 'textwrap', 'unicodedata', 'stringprep', 'readline', 'rlcompleter',

    // Binary Data
    'struct', 'codecs',

    // Data Types
    'datetime', 'zoneinfo', 'calendar', 'collections', 'heapq', 'bisect', 'array', 'weakref',
    'types', 'copy', 'pprint', 'reprlib', 'enum', 'graphlib',

    // Numeric & Math
    'numbers', 'math', 'cmath', 'decimal', 'fractions', 'random', 'statistics',

    // Functional Programming
    'itertools', 'functools', 'operator',

    // File & Directory
    'pathlib', 'os', 'io', 'time', 'argparse', 'getopt', 'logging', 'getpass', 'curses',
    'platform', 'errno', 'ctypes',

    // File Formats
    'csv', 'configparser', 'tomllib', 'netrc', 'plistlib',

    // Cryptographic
    'hashlib', 'hmac', 'secrets',

    // OS Services
    'os', 'sys', 'syslog', 'pty', 'tty', 'termios', 'resource', 'sysconfig',

    // Concurrent
    'threading', 'multiprocessing', 'concurrent', 'subprocess', 'sched', 'queue', 'contextvars',

    // Networking
    'asyncio', 'socket', 'ssl', 'select', 'selectors', 'signal',

    // Internet Data
    'email', 'json', 'mailbox', 'mimetypes', 'base64', 'binascii', 'quopri',

    // HTML & XML
    'html', 'xml',

    // Internet Protocols
    'webbrowser', 'wsgiref', 'urllib', 'http', 'ftplib', 'poplib', 'imaplib', 'smtplib',
    'telnetlib', 'uuid', 'socketserver', 'xmlrpc', 'ipaddress',

    // Multimedia
    'wave', 'colorsys',

    // Internationalization
    'gettext', 'locale',

    // Program Frameworks
    'turtle', 'cmd', 'shlex',

    // GUI
    'tkinter', 'idlelib',

    // Development Tools
    'typing', 'pydoc', 'doctest', 'unittest', 'test', '2to3', 'lib2to3',

    // Debugging & Profiling
    'bdb', 'faulthandler', 'pdb', 'timeit', 'trace', 'tracemalloc',

    // Packaging
    'venv', 'zipapp', 'ensurepip',

    // Runtime
    'sys', 'sysconfig', 'builtins', 'warnings', 'dataclasses', 'contextlib', 'abc',
    'atexit', 'traceback', 'gc', 'inspect', 'site',

    // Importing
    'importlib', 'zipimport', 'pkgutil', 'modulefinder', 'runpy',

    // Python Language
    'parser', 'ast', 'symtable', 'symbol', 'token', 'keyword', 'tokenize', 'tabnanny',
    'pyclbr', 'py_compile', 'compileall', 'dis', 'pickletools',

    // Misc
    'formatter', '__future__', 'code', 'codeop',

    // Compression
    'zlib', 'gzip', 'bz2', 'lzma', 'zipfile', 'tarfile',

    // Persistence
    'pickle', 'copyreg', 'shelve', 'marshal', 'dbm', 'sqlite3',

    // Additional common ones
    'glob', 'fnmatch', 'linecache', 'shutil', 'tempfile', 'fileinput', 'stat', 'filecmp',
    'mmap', 'posix', 'posixpath', 'ntpath', 'genericpath', 'nt', 'msvcrt', 'winreg', 'winsound',

    // Undocumented but common
    '_thread', '__main__', '_collections_abc', '_io',
]);

/**
 * Check if a module is part of Python's standard library
 * @param {string} moduleName - The root module name
 * @returns {boolean}
 */
export function isStdlibModule(moduleName) {
    // Get the root module (e.g., 'os.path' -> 'os')
    const rootModule = moduleName.split('.')[0];
    return STDLIB_MODULES.has(rootModule);
}
