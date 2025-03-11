-- Database structure for Moma. Users are linked to all other tables with a foreign key,
-- and cascade deletion is implemented so that if a user is deleted, so is their data.

-- Stores user details.
CREATE TABLE Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- A foreign key in all other tables to allow for multi-user support.
    userName TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    businessName TEXT
);

-- Stores a users' clients.
CREATE TABLE Clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    name TEXT NOT NULL,
    details TEXT,
    phoneNumber TEXT,
    email TEXT,
    linkedin TEXT,
    FOREIGN KEY (userId) REFERENCES Users (id) ON DELETE CASCADE
);

-- Stores projects; collections of joined tasks that make up a larger goal.
CREATE TABLE Projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    clientId INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'not_started', -- Can be not_started, in_progress, waiting_approval, complete.
    deadline DATE,
    urgency INTEGER,
    FOREIGN KEY (userId) REFERENCES Users (id) ON DELETE CASCADE,
    FOREIGN KEY (clientId) REFERENCES Clients (id) ON DELETE SET NULL
);

-- Stores subtasks of projects, so they can each be individually ticked off as the project progresses.s
CREATE TABLE SubTasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'not_started', -- Can be not_started, in_progress, complete.
    FOREIGN KEY (projectId) REFERENCES Projects (id) ON DELETE CASCADE
);

-- Stores all tasks.
CREATE TABLE Tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    clientId INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'not_started', -- Can be not_started, in_progress, waiting_approval, complete.
    priority INTEGER, -- Priority level (structure could be: 1 = High, 2 = Medium, 3 = Low).
    dueDate DATE,
    urgency INTEGER,
    FOREIGN KEY (userId) REFERENCES Users (id) ON DELETE CASCADE,
    FOREIGN KEY (clientId) REFERENCES Clients (id) ON DELETE SET NULL
);

-- Stores tags the user makes for categorizing to-do's.
CREATE TABLE Tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    name TEXT NOT NULL UNIQUE,
    FOREIGN KEY (userId) REFERENCES Users (id) ON DELETE CASCADE
);

-- Ensures a many-to-many relationship between tasks and tags.
CREATE TABLE TaskTags (
    taskId INTEGER NOT NULL,
    tagId INTEGER NOT NULL,
    PRIMARY KEY (taskId, tagId),
    FOREIGN KEY (taskId) REFERENCES Tasks (id) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES Tags (id) ON DELETE CASCADE
);

-- Ensures a many-to-many relationship between projects and tags.
CREATE TABLE ProjectTags (
    projectId INTEGER NOT NULL,
    tagId INTEGER NOT NULL,
    PRIMARY KEY (projectId, tagId),
    FOREIGN KEY (projectId) REFERENCES Projects (id) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES Tags (id) ON DELETE CASCADE
);

-- Stores the data in the users' expense tracking table.
CREATE TABLE Expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    date DATE NOT NULL,
    amount REAL NOT NULL,
    source TEXT NOT NULL,
    receipt BLOB, -- For uploaded files.
    FOREIGN KEY (userId) REFERENCES Users (id) ON DELETE CASCADE
);

-- Stores time tracking data for analytics.
CREATE TABLE TimeTracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    taskId INTEGER,
    projectId INTEGER,
    clientId INTEGER,
    startTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    endTime TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES Users (id) ON DELETE CASCADE,
    FOREIGN KEY (taskId) REFERENCES Tasks (id) ON DELETE SET NULL,
    FOREIGN KEY (projectId) REFERENCES Projects (id) ON DELETE SET NULL,
    FOREIGN KEY (clientId) REFERENCES Clients (id) ON DELETE SET NULL
);