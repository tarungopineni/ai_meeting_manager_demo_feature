from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = 'postgresql://postgres:Tarun%40123@localhost/whisper'
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as connection:
    try:
        print("Checking/Altering tasks table...")
        connection.execute(text("ALTER TABLE tasks ADD COLUMN approved_by_manager BOOLEAN DEFAULT FALSE"))
        connection.commit()
        print("Added column approved_by_manager successfully!")
    except Exception as e:
        print("Altering table failed (column might already exist):", e)
        
    try:
        print("Updating existing tasks to be approved by default...")
        connection.execute(text("UPDATE tasks SET approved_by_manager = TRUE"))
        connection.commit()
        print("Updated existing tasks successfully!")
    except Exception as e:
        print("Failed to update existing tasks:", e)

    try:
        print("Setting approved_by_manager NOT NULL constraint...")
        connection.execute(text("ALTER TABLE tasks ALTER COLUMN approved_by_manager SET NOT NULL"))
        connection.commit()
        print("Constraint set successfully!")
    except Exception as e:
        print("Failed to set NOT NULL constraint:", e)
