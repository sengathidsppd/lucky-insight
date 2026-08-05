"""Test importing tickets router to verify no silent syntax or import errors."""

def main():
    try:
        from app.api.v1.tickets import router as tickets_v1_router
        print("Successfully imported tickets_v1_router!")
        print("Routes inside tickets_v1_router:")
        for route in tickets_v1_router.routes:
            print(f"  {route.methods} {route.path}")
    except Exception as e:
        print("Import Error in tickets router:", e)

if __name__ == "__main__":
    main()
