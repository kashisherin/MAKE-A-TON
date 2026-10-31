import sqlite3
import os
import sys

def inspect_db(name, path):
    print(f"\n=== Inspecting {name} ({path}) ===")
    if not os.path.exists(path):
        print("  FILE NOT FOUND!")
        return
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    print(f"  Found {len(tables)} tables: {tables}")
    for t in tables:
        count = cur.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
        print(f"    - {t}: {count} records")
    conn.close()

if __name__ == "__main__":
    inspect_db("Control Tower DB", r"D:\SUBSCRIPTION MANAGEMENT\Brightloop_Subscription_Control_Tower\outputs\brightloop_300_clients.sqlite3")
    inspect_db("Django DB", r"D:\SUBSCRIPTION MANAGEMENT\brightloop_backend\db.sqlite3")
    inspect_db("KASHI Dev DB", r"D:\SUBSCRIPTION MANAGEMENT\kashi_dev.db")

