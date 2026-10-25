"""Read the content identity shared by Docker's classic and containerd stores."""

import hashlib
import json
import sys
import tarfile

with tarfile.open(sys.argv[1]) as archive:
    manifest_file = archive.extractfile("manifest.json")
    if manifest_file is None:
        raise ValueError("Image archive has no manifest")
    manifest = json.load(manifest_file)
    if not isinstance(manifest, list) or len(manifest) != 1:
        raise ValueError("Expected exactly one image in archive")
    config_file = archive.extractfile(manifest[0]["Config"])
    if config_file is None:
        raise ValueError("Image archive has no configuration")
    print("sha256:" + hashlib.file_digest(config_file, "sha256").hexdigest())
