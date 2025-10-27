# backend/storage_sync.py
import os, json, time, hashlib, pathlib, urllib.request, urllib.error
# add at the top of storage_sync.py
from pathlib import Path
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except Exception:
    pass
SUPABASE_URL         = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY         = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY", "")
RAW_BUCKET           = os.environ.get("RAW_BUCKET", "raw-master")
GPKG_REMOTE_PATH     = os.environ.get("RAW_GPKG_PATH", "master.gpkg")
CENSUS_PREFIX        = os.environ.get("RAW_CENSUS_PREFIX", "census/clean/")
LOCAL_BASE           = pathlib.Path(os.environ.get("LOCAL_DATA_BASE", "data_master")).resolve()
LOCAL_GPKG           = LOCAL_BASE / "master.gpkg"
LOCAL_CENSUS_DIR     = LOCAL_BASE / "census" / "clean"
HEADERS = {
  "Authorization": f"Bearer {SUPABASE_KEY}",
  "apikey": SUPABASE_KEY,
} if SUPABASE_KEY else {}


def _ensure_dirs():
    (LOCAL_BASE).mkdir(parents=True, exist_ok=True)
    (LOCAL_CENSUS_DIR).mkdir(parents=True, exist_ok=True)

def _url_object(bucket: str, path: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}"

def _url_list(bucket: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/list/{bucket}"

def _http_get(url: str, dest: pathlib.Path):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp, open(dest, "wb") as f:
        f.write(resp.read())

def _http_post(url: str, data: dict) -> dict:
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type":"application/json", **HEADERS})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def _needs_download(remote_info: dict, dest: pathlib.Path) -> bool:
    if not dest.exists():
        return True
    # If size is known, compare; otherwise always redownload
    size = remote_info.get("metadata", {}).get("size") or remote_info.get("size")
    if size and dest.stat().st_size != int(size):
        return True
    return False

def _list_objects(prefix: str):
    # Supabase Storage list: POST /object/list/<bucket> with {"prefix": "..."}
    res = _http_post(_url_list(RAW_BUCKET), {"prefix": prefix, "limit": 1000})
    # Response shape: {"name": "...", "id": "...", "updated_at": "...", "metadata":{"size":...}, ...}
    return res if isinstance(res, list) else res.get("items", [])

def _download_object(path_remote: str, dest_local: pathlib.Path, remote_info: dict = None):
    url = _url_object(RAW_BUCKET, path_remote)
    dest_local.parent.mkdir(parents=True, exist_ok=True)
    _http_get(url, dest_local)

def sync():
    assert SUPABASE_URL, "SUPABASE_URL not set"
    assert SUPABASE_KEY, "SUPABASE_SERVICE_KEY (or SUPABASE_KEY) not set"

    _ensure_dirs()

    # 1) master.gpkg
    try:
        # HEAD not available in Storage REST; we just try to fetch if missing
        if not LOCAL_GPKG.exists():
            _download_object(GPKG_REMOTE_PATH, LOCAL_GPKG)
        else:
            # Re-download if size mismatch (list metadata)
            items = _list_objects(GPKG_REMOTE_PATH)
            remote_info = items[0] if items else {}
            if _needs_download(remote_info, LOCAL_GPKG):
                _download_object(GPKG_REMOTE_PATH, LOCAL_GPKG)
        print(f"[storage_sync] master.gpkg ready at {LOCAL_GPKG}")
    except Exception as e:
        print(f"[storage_sync] WARN: could not sync master.gpkg: {e}")

    # 2) census parquet files under prefix
    try:
        objs = _list_objects(CENSUS_PREFIX)
        for obj in objs:
            name = obj.get("name") or obj.get("path") or obj.get("Key")
            if not name or not name.endswith(".parquet"):
                continue
            rel = name if name.startswith(CENSUS_PREFIX) else f"{CENSUS_PREFIX.rstrip('/')}/{name}"
            dest = LOCAL_BASE / rel
            if _needs_download(obj, dest):
                _download_object(rel, dest, obj)
        print(f"[storage_sync] census parquet ready under {LOCAL_CENSUS_DIR}")
    except Exception as e:
        print(f"[storage_sync] WARN: could not sync census parquet: {e}")

if __name__ == "__main__":
    sync()
