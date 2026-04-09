**what I build with and why I picked**

Frontend -->    React (Lovable) --> Fast UI development, interactive controls
Data Processing --> Python (Pandas, PyArrow) --> Efficient parquet parsing
Hosting --> Lovable --> Quick deployment & easy sharing and Vibe-coding


**Data Flow**
1. Raw parquet files (player-level data per match)
2. Python script converts parquet → JSON
3. Decode event (bytes → string)
4. Add is_bot flag (numeric vs UUID)
6. Data grouped by match_id
7. JSON loaded into frontend
UI renders:
- Player movement
- Events (kills, deaths, loot, storm)
- Heatmaps & timeline playback

**Coordinate mapping**

Game provides 3D world coordinates (x, y, z).

For 2D minimap:

Use x (horizontal) and z (vertical)
Ignore y (elevation)
Mapping Steps
Normalize to UV space:
u = (x - origin_x) / scale
v = (z - origin_z) / scale
Convert to pixels (1024 × 1024 map):
pixel_x = u × 1024
pixel_y = (1 - v) × 1024

Y-axis is flipped because:

Game origin = bottom-left
Image origin = top-left
Implementation Choice

Mapping is done in real-time in the frontend, not stored in JSON.

Why:

Supports multiple maps dynamically
Keeps data clean (raw coordinates)
Easier to update mapping logic

**Trade offs**

Decision      |  Chosen | Alternative   |Reason
Data storage  | JSON    | Backend API   |Faster to implement
Mapping location|   Frontend    | Precomputed   | Flexibility

