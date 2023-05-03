PARENT_DIR="$(cd "$(dirname "$0")/.." && pwd)/"
rsync $PARENT_DIR -azP --exclude=".*" -e ssh $SIMBRAIN_REMOTE_DIR
