const db = require('./src/db');
const bcrypt = require('bcrypt');

const pythonQuizzes = [
    {
        title: 'Python Level 1: Syntax & Basics',
        category: 'Programming',
        difficulty: 'Beginner',
        questions: [
            { type: 'multiple_choice', text: 'What is the correct file extension for Python files?', options: ['.py', '.python', '.pt', '.pyt'], correctAnswer: '.py' },
            { type: 'multiple_choice', text: 'How do you output text to the console?', options: ['echo()', 'print()', 'log()', 'write()'], correctAnswer: 'print()' },
            { type: 'multiple_choice', text: 'Which of these is a valid variable name?', options: ['2myVar', 'my-var', 'my_var', 'my var'], correctAnswer: 'my_var' },
            { type: 'true_false', text: 'Python is case-sensitive.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What is the result of 10 // 3?', options: ['3.33', '3', '4', '3.0'], correctAnswer: '3' },
            { type: 'multiple_choice', text: 'Which keyword is used to define a function?', options: ['func', 'def', 'function', 'void'], correctAnswer: 'def' },
            { type: 'true_false', text: 'Comments in Python start with #.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What data type is "Hello"?', options: ['int', 'str', 'float', 'bool'], correctAnswer: 'str' },
            { type: 'multiple_choice', text: 'How do you create a list?', options: ['{}', '[]', '()', '<>'], correctAnswer: '[]' },
            { type: 'true_false', text: 'Indentation matters in Python.', correctAnswer: 'true' }
        ]
    },
    {
        title: 'Python Level 2: Control Flow',
        category: 'Programming',
        difficulty: 'Beginner',
        questions: [
            { type: 'multiple_choice', text: 'Which keyword starts a conditional statement?', options: ['check', 'if', 'when', 'loop'], correctAnswer: 'if' },
            { type: 'multiple_choice', text: 'How do you write "else if" in Python?', options: ['elseif', 'else if', 'elif', 'otherwise'], correctAnswer: 'elif' },
            { type: 'multiple_choice', text: 'Which loop is used to iterate over a sequence?', options: ['for', 'while', 'foreach', 'loop'], correctAnswer: 'for' },
            { type: 'true_false', text: 'The break statement stops the loop.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What does range(5) generate?', options: ['1,2,3,4,5', '0,1,2,3,4', '0,1,2,3,4,5', '1,2,3,4'], correctAnswer: '0,1,2,3,4' },
            { type: 'multiple_choice', text: 'Which statement skips the current iteration?', options: ['skip', 'pass', 'continue', 'next'], correctAnswer: 'continue' },
            { type: 'true_false', text: 'A while loop runs as long as the condition is true.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What is the output of bool(0)?', options: ['True', 'False', 'None', 'Error'], correctAnswer: 'False' },
            { type: 'multiple_choice', text: 'Which operator checks for equality?', options: ['=', '==', '===', '<>'], correctAnswer: '==' },
            { type: 'true_false', text: 'You can nest if statements.', correctAnswer: 'true' }
        ]
    },
    {
        title: 'Python Level 3: Functions & Modules',
        category: 'Programming',
        difficulty: 'Intermediate',
        questions: [
            { type: 'multiple_choice', text: 'What keyword returns a value from a function?', options: ['give', 'return', 'yield', 'send'], correctAnswer: 'return' },
            { type: 'multiple_choice', text: 'How do you import a module named "math"?', options: ['include math', 'import math', 'using math', 'require math'], correctAnswer: 'import math' },
            { type: 'true_false', text: 'Functions can have default parameter values.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What is a lambda function?', options: ['A named function', 'A recursive function', 'An anonymous function', 'A loop'], correctAnswer: 'An anonymous function' },
            { type: 'multiple_choice', text: 'Which scope is checked first?', options: ['Global', 'Local', 'Enclosing', 'Built-in'], correctAnswer: 'Local' },
            { type: 'true_false', text: 'You can return multiple values from a function.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What does *args do?', options: ['Passes a list', 'Passes a dictionary', 'Passes variable positional arguments', 'Passes a tuple'], correctAnswer: 'Passes variable positional arguments' },
            { type: 'multiple_choice', text: 'What does **kwargs do?', options: ['Passes variable keyword arguments', 'Passes a list', 'Passes a set', 'Passes a string'], correctAnswer: 'Passes variable keyword arguments' },
            { type: 'true_false', text: 'A module is just a file containing Python code.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'How do you alias a module?', options: ['import math as m', 'import math alias m', 'import m from math', 'alias math m'], correctAnswer: 'import math as m' }
        ]
    },
    {
        title: 'Python Level 4: Data Structures',
        category: 'Programming',
        difficulty: 'Intermediate',
        questions: [
            { type: 'multiple_choice', text: 'Which data structure is mutable?', options: ['Tuple', 'String', 'List', 'Integer'], correctAnswer: 'List' },
            { type: 'multiple_choice', text: 'How do you access the value of key "k" in dict "d"?', options: ['d.k', 'd["k"]', 'd(k)', 'd->k'], correctAnswer: 'd["k"]' },
            { type: 'true_false', text: 'Sets allow duplicate elements.', correctAnswer: 'false' },
            { type: 'multiple_choice', text: 'Which method adds an element to a list?', options: ['push()', 'add()', 'append()', 'insert()'], correctAnswer: 'append()' },
            { type: 'multiple_choice', text: 'What is a tuple?', options: ['Mutable list', 'Immutable list', 'Dictionary', 'Set'], correctAnswer: 'Immutable list' },
            { type: 'multiple_choice', text: 'How do you get the length of a list?', options: ['size()', 'length()', 'count()', 'len()'], correctAnswer: 'len()' },
            { type: 'true_false', text: 'Dictionaries preserve insertion order (Python 3.7+).', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'Which method removes the last item from a list?', options: ['remove()', 'delete()', 'pop()', 'clear()'], correctAnswer: 'pop()' },
            { type: 'multiple_choice', text: 'What is the syntax for list comprehension?', options: ['[x for x in list]', '{x for x in list}', '(x for x in list)', 'list(x for x in list)'], correctAnswer: '[x for x in list]' },
            { type: 'true_false', text: 'Strings are iterable.', correctAnswer: 'true' }
        ]
    },
    {
        title: 'Python Level 5: File & Exception Handling',
        category: 'Programming',
        difficulty: 'Intermediate',
        questions: [
            { type: 'multiple_choice', text: 'Which keyword is used to handle exceptions?', options: ['catch', 'except', 'handle', 'error'], correctAnswer: 'except' },
            { type: 'multiple_choice', text: 'What is the best way to open a file?', options: ['open()', 'with open()', 'file()', 'read()'], correctAnswer: 'with open()' },
            { type: 'true_false', text: 'The finally block always executes.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'Which mode opens a file for writing?', options: ['"r"', '"w"', '"a"', '"x"'], correctAnswer: '"w"' },
            { type: 'multiple_choice', text: 'How do you raise an exception manually?', options: ['throw', 'raise', 'error', 'trigger'], correctAnswer: 'raise' },
            { type: 'true_false', text: 'You can have multiple except blocks.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What does readlines() return?', options: ['String', 'List of lines', 'First line', 'File object'], correctAnswer: 'List of lines' },
            { type: 'multiple_choice', text: 'Which exception is raised for division by zero?', options: ['ValueError', 'TypeError', 'ZeroDivisionError', 'MathError'], correctAnswer: 'ZeroDivisionError' },
            { type: 'true_false', text: 'File handles must be closed if not using "with".', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What mode appends to a file?', options: ['"w"', '"r"', '"a"', '"w+"'], correctAnswer: '"a"' }
        ]
    },
    {
        title: 'Python Level 6: OOP',
        category: 'Programming',
        difficulty: 'Advanced',
        questions: [
            { type: 'multiple_choice', text: 'Which keyword defines a class?', options: ['struct', 'class', 'object', 'type'], correctAnswer: 'class' },
            { type: 'multiple_choice', text: 'What is the constructor method in Python?', options: ['__init__', '__new__', '__construct__', 'init'], correctAnswer: '__init__' },
            { type: 'true_false', text: 'Python supports multiple inheritance.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What does "self" represent?', options: ['The class', 'The instance', 'The parent', 'Global scope'], correctAnswer: 'The instance' },
            { type: 'multiple_choice', text: 'How do you call the parent class constructor?', options: ['super().__init__()', 'parent.__init__()', 'Base.__init__()', 'this.super()'], correctAnswer: 'super().__init__()' },
            { type: 'true_false', text: 'All classes inherit from object.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What is a static method?', options: ['Bound to instance', 'Bound to class', 'Bound to nothing', 'Private method'], correctAnswer: 'Bound to class' },
            { type: 'multiple_choice', text: 'Which decorator marks a class method?', options: ['@staticmethod', '@classmethod', '@method', '@class'], correctAnswer: '@classmethod' },
            { type: 'true_false', text: 'Private members are denoted by double underscore.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What is polymorphism?', options: ['Multiple forms', 'Data hiding', 'Inheritance', 'Encapsulation'], correctAnswer: 'Multiple forms' }
        ]
    },
    {
        title: 'Python Level 7: Advanced Functions',
        category: 'Programming',
        difficulty: 'Advanced',
        questions: [
            { type: 'multiple_choice', text: 'What is a decorator?', options: ['A function that modifies another function', 'A class', 'A comment', 'A variable'], correctAnswer: 'A function that modifies another function' },
            { type: 'multiple_choice', text: 'What keyword creates a generator?', options: ['return', 'yield', 'gen', 'produce'], correctAnswer: 'yield' },
            { type: 'true_false', text: 'Generators are memory efficient.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What does map() do?', options: ['Applies function to items', 'Filters items', 'Reduces items', 'Sorts items'], correctAnswer: 'Applies function to items' },
            { type: 'multiple_choice', text: 'What does filter() do?', options: ['Removes items based on condition', 'Changes items', 'Sorts items', 'Counts items'], correctAnswer: 'Removes items based on condition' },
            { type: 'true_false', text: 'Decorators use the @ symbol.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What is a closure?', options: ['Inner function remembering outer scope', 'End of function', 'Private variable', 'Class method'], correctAnswer: 'Inner function remembering outer scope' },
            { type: 'multiple_choice', text: 'What is the output of (lambda x: x*2)(3)?', options: ['6', '9', '3', 'Error'], correctAnswer: '6' },
            { type: 'true_false', text: 'functools.wraps is used in decorators.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What is partial application?', options: ['Fixing some arguments of a function', 'Running half a function', 'Importing part of module', 'None'], correctAnswer: 'Fixing some arguments of a function' }
        ]
    },
    {
        title: 'Python Level 8: Standard Library',
        category: 'Programming',
        difficulty: 'Advanced',
        questions: [
            { type: 'multiple_choice', text: 'Which module handles dates and times?', options: ['time', 'datetime', 'date', 'calendar'], correctAnswer: 'datetime' },
            { type: 'multiple_choice', text: 'Which module interacts with the OS?', options: ['sys', 'os', 'system', 'platform'], correctAnswer: 'os' },
            { type: 'true_false', text: 'The "re" module is for regular expressions.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'Which module is used for random numbers?', options: ['rand', 'random', 'rng', 'math'], correctAnswer: 'random' },
            { type: 'multiple_choice', text: 'How do you parse JSON?', options: ['json.parse()', 'json.load()', 'json.read()', 'json.decode()'], correctAnswer: 'json.load()' },
            { type: 'true_false', text: 'sys.argv contains command line arguments.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'Which module is for unit testing?', options: ['test', 'unittest', 'pytest', 'check'], correctAnswer: 'unittest' },
            { type: 'multiple_choice', text: 'What does os.getcwd() return?', options: ['Current working directory', 'Home directory', 'Root directory', 'Path separator'], correctAnswer: 'Current working directory' },
            { type: 'true_false', text: 'collections.Counter counts hashable objects.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'Which module helps with CSV files?', options: ['excel', 'csv', 'pandas', 'file'], correctAnswer: 'csv' }
        ]
    },
    {
        title: 'Python Level 9: Concurrency',
        category: 'Programming',
        difficulty: 'Expert',
        questions: [
            { type: 'multiple_choice', text: 'What is the GIL?', options: ['Global Interpreter Lock', 'General Interface Logic', 'Global Interface Loop', 'Graphical Interface Layer'], correctAnswer: 'Global Interpreter Lock' },
            { type: 'multiple_choice', text: 'Which module is for threading?', options: ['thread', 'threading', 'concurrent', 'tasks'], correctAnswer: 'threading' },
            { type: 'true_false', text: 'Threads share the same memory space.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'Which module is for multiprocessing?', options: ['process', 'multiprocessing', 'parallel', 'cores'], correctAnswer: 'multiprocessing' },
            { type: 'multiple_choice', text: 'What keyword is used for async functions?', options: ['async', 'await', 'promise', 'defer'], correctAnswer: 'async' },
            { type: 'true_false', text: 'multiprocessing bypasses the GIL.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What does await do?', options: ['Pauses execution until awaitable completes', 'Stops the program', 'Starts a thread', 'Defines a coroutine'], correctAnswer: 'Pauses execution until awaitable completes' },
            { type: 'multiple_choice', text: 'Which library is the foundation of async Python?', options: ['asyncio', 'twisted', 'tornado', 'gevent'], correctAnswer: 'asyncio' },
            { type: 'true_false', text: 'Race conditions can occur in threading.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What is a deadlock?', options: ['Threads waiting for each other indefinitely', 'Program crash', 'Memory leak', 'CPU overload'], correctAnswer: 'Threads waiting for each other indefinitely' }
        ]
    },
    {
        title: 'Python Level 10: Internals & Advanced',
        category: 'Programming',
        difficulty: 'Expert',
        questions: [
            { type: 'multiple_choice', text: 'What is a metaclass?', options: ['A class of a class', 'A super class', 'A subclass', 'An abstract class'], correctAnswer: 'A class of a class' },
            { type: 'multiple_choice', text: 'Which method controls attribute access?', options: ['__getattr__', '__get__', '__access__', '__read__'], correctAnswer: '__getattr__' },
            { type: 'true_false', text: 'Everything in Python is an object.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What is __slots__ used for?', options: ['Memory optimization', 'Defining methods', 'Private variables', 'Inheritance'], correctAnswer: 'Memory optimization' },
            { type: 'multiple_choice', text: 'What is the MRO?', options: ['Method Resolution Order', 'Memory Read Operation', 'Method Run Order', 'Main Runtime Object'], correctAnswer: 'Method Resolution Order' },
            { type: 'true_false', text: 'Python uses reference counting for garbage collection.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What does the "dis" module do?', options: ['Disassembles bytecode', 'Disables GC', 'Displays errors', 'Distributes tasks'], correctAnswer: 'Disassembles bytecode' },
            { type: 'multiple_choice', text: 'What is a context manager?', options: ['Object defining __enter__ and __exit__', 'A variable scope', 'A thread manager', 'A database connection'], correctAnswer: 'Object defining __enter__ and __exit__' },
            { type: 'true_false', text: 'You can change the class of an object at runtime.', correctAnswer: 'true' },
            { type: 'multiple_choice', text: 'What is monkey patching?', options: ['Modifying code at runtime', 'Fixing bugs', 'Writing tests', 'Optimizing loops'], correctAnswer: 'Modifying code at runtime' }
        ]
    }
];

async function resetAndSeed() {
    console.log('🗑️  Clearing all existing data...');

    // Wait for DB to be ready
    setTimeout(async () => {
        try {
            // Clear all tables
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM question_attempts', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log('✓ Cleared question_attempts');

            await new Promise((resolve, reject) => {
                db.run('DELETE FROM results', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log('✓ Cleared results');

            await new Promise((resolve, reject) => {
                db.run('DELETE FROM quiz_reviews', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log('✓ Cleared quiz_reviews');

            await new Promise((resolve, reject) => {
                db.run('DELETE FROM user_quiz_library', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log('✓ Cleared user_quiz_library');

            await new Promise((resolve, reject) => {
                db.run('DELETE FROM questions', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log('✓ Cleared questions');

            await new Promise((resolve, reject) => {
                db.run('DELETE FROM quizzes', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log('✓ Cleared quizzes');

            await new Promise((resolve, reject) => {
                db.run('DELETE FROM users', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log('✓ Cleared users');

            // Create System admin user
            console.log('\n👤 Creating System admin user...');
            const hashedPassword = await bcrypt.hash('system123', 10);
            const systemUserId = await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO users (username, password) VALUES (?, ?)',
                    ['System', hashedPassword],
                    function (err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
            console.log(`✓ Created System admin (ID: ${systemUserId})`);

            // Seed Python quizzes as published
            console.log('\n📚 Seeding Python quizzes...');
            for (const quizData of pythonQuizzes) {
                // Create quiz with System as creator, status 'approved', is_public = 1
                const quizId = await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT INTO quizzes (title, category, difficulty, creator_id, status, is_public) VALUES (?, ?, ?, ?, ?, ?)',
                        [quizData.title, quizData.category, quizData.difficulty, systemUserId, 'approved', 1],
                        function (err) {
                            if (err) reject(err);
                            else resolve(this.lastID);
                        }
                    );
                });
                console.log(`  ✓ Created: ${quizData.title} (ID: ${quizId})`);

                // Add questions
                for (const q of quizData.questions) {
                    await new Promise((resolve, reject) => {
                        const options = q.type === 'multiple_choice' ? JSON.stringify(q.options) : null;
                        db.run(
                            'INSERT INTO questions (quiz_id, type, question_text, options, correct_answer) VALUES (?, ?, ?, ?, ?)',
                            [quizId, q.type, q.text, options, q.correctAnswer],
                            function (err) {
                                if (err) reject(err);
                                else resolve(this.lastID);
                            }
                        );
                    });
                }
                console.log(`    → Added ${quizData.questions.length} questions`);
            }

            console.log('\n✅ Database reset and seeding complete!');
            console.log('\n📊 Summary:');
            console.log(`   - System admin created (username: "System", password: "system123")`);
            console.log(`   - ${pythonQuizzes.length} Python quizzes published to Quiz Hub`);
            console.log(`   - All quizzes are in "approved" status and publicly visible`);

            process.exit(0);
        } catch (err) {
            console.error('❌ Error during reset and seed:', err);
            process.exit(1);
        }
    }, 1000);
}

resetAndSeed();
