from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import sqlite3, hashlib, json

app = Flask(__name__)
app.secret_key = "genarch_secret_2024"
DB = "database.db"

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
        db.execute("""CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL, plot_length REAL, plot_width REAL,
            building_type TEXT, bedrooms INTEGER, bathrooms INTEGER,
            halls INTEGER, kitchens INTEGER, floors INTEGER,
            design_style TEXT, orientation TEXT, design_data TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id))""")
        db.commit()

init_db()

def hash_pw(pw): return hashlib.sha256(pw.encode()).hexdigest()

def login_required(f):
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session: return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper

@app.route("/")
def index(): return redirect(url_for("login"))


# ══════════════════════════════════════════════════════════════════════════════
# AUTH  ── login / signup / logout / forgot-password / reset-password
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        d = request.get_json() or {}
        email    = d.get("email", "").strip().lower()
        password = d.get("password", "")

        if not email or not password:
            return jsonify({"ok": False, "msg": "Please fill in all fields"})

        with get_db() as db:
            user = db.execute(
                "SELECT * FROM users WHERE email=? AND password=?",
                (email, hash_pw(password))
            ).fetchone()

        if user:
            session["user_id"]  = user["id"]
            session["username"] = user["username"]
            return jsonify({"ok": True})

        return jsonify({"ok": False, "msg": "Invalid email or password"})

    return render_template("login.html")


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        d        = request.get_json() or {}
        username = d.get("username", "").strip()
        email    = d.get("email",    "").strip().lower()
        password = d.get("password", "")

        if not username.isalpha():
            return jsonify({"ok": False, "msg": "Username must contain only letters"})

        try:
            with get_db() as db:
                db.execute(
                    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
                    (username, email, hash_pw(password))
                )
                db.commit()
            return jsonify({"ok": True})
        except sqlite3.IntegrityError:
            return jsonify({"ok": False, "msg": "Username or Email already exists"})

    return render_template("signup.html")


# ── Forgot Password page (GET) ────────────────────────────────────────────────
@app.route("/forgot-password", methods=["GET"])
def forgot_password():
    return render_template("forgot-password.html")


# ── Reset Password (POST) ─────────────────────────────────────────────────────
@app.route("/reset-password", methods=["POST"])
def reset_password():
    d        = request.get_json() or {}
    email    = d.get("email",    "").strip().lower()
    password = d.get("password", "")

    if not email or not password:
        return jsonify({"ok": False, "msg": "Please fill in all fields"})

    # Server-side password validation (mirrors front-end rules)
    if len(password) < 8:
        return jsonify({"ok": False, "msg": "Password must be at least 8 characters"})
    if not any(c.isupper() for c in password):
        return jsonify({"ok": False, "msg": "Password must contain an uppercase letter"})
    if not any(c.isdigit() for c in password):
        return jsonify({"ok": False, "msg": "Password must contain a number"})
    import re
    if not re.search(r'[!@#$%^&*()\-_=+\[\]{};:\'",.<>/?\\|`~]', password):
        return jsonify({"ok": False, "msg": "Password must contain a special character"})

    with get_db() as db:
        user = db.execute(
            "SELECT id FROM users WHERE email=?", (email,)
        ).fetchone()

        if not user:
            return jsonify({"ok": False, "msg": "No account found with that email"})

        db.execute(
            "UPDATE users SET password=? WHERE email=?",
            (hash_pw(password), email)   # hashed with same SHA-256 as signup/login
        )
        db.commit()

    return jsonify({"ok": True})


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ══════════════════════════════════════════════════════════════════════════════
# PAGES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/home")
@login_required
def home(): return render_template("home.html", username=session["username"])

@app.route("/project")
@login_required
def project(): return render_template("project.html", username=session["username"])

@app.route("/designs")
@login_required
def designs():
    pid = request.args.get("pid")
    with get_db() as db:
        if not pid:
            latest = db.execute(
                "SELECT id FROM projects WHERE user_id=? ORDER BY created_at DESC LIMIT 1",
                (session["user_id"],)
            ).fetchone()
            if latest: return redirect(url_for("designs", pid=latest["id"]))
            return redirect(url_for("project"))
        proj = db.execute(
            "SELECT * FROM projects WHERE id=? AND user_id=?",
            (pid, session["user_id"])
        ).fetchone()
    if not proj: return redirect(url_for("project"))
    return render_template("designs.html", username=session["username"],
                           project=dict(proj), design_data=json.loads(proj["design_data"]))

@app.route("/reports")
@login_required
def reports(): return render_template("reports.html", username=session["username"])


# ══════════════════════════════════════════════════════════════════════════════
# GENERATE
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/generate", methods=["POST"])
@login_required
def generate():
    d     = request.get_json() or {}
    pl    = float(d.get("plot_length", 0))
    pw    = float(d.get("plot_width",  0))
    bt    = d.get("building_type", "Residential")
    beds  = max(0, int(d.get("bedrooms",  2)))
    baths = max(0, int(d.get("bathrooms", 1)))
    halls = max(0, int(d.get("halls",     1)))
    kits  = max(0, int(d.get("kitchens",  1)))
    flrs  = max(1, min(5, int(d.get("floors", 1))))
    style = d.get("design_style", "Modern")
    ori   = d.get("orientation",  "East-Facing")

    if pl < 20 or pw < 20:
        return jsonify({"ok": False, "msg": f"Minimum plot size is 20×20 ft. You entered {pl}×{pw} ft."})

    total_req = beds + baths + halls + kits
    if flrs >= 2 and total_req < 4:
        return jsonify({"ok": False,
            "msg": f"For {flrs} floors, please provide at least 4 total rooms. You specified only {total_req}."})
    if flrs >= 3 and total_req < 6:
        return jsonify({"ok": False,
            "msg": f"For {flrs} floors, you need at least 6 total rooms. You specified {total_req}."})

    data = make_plans(pl, pw, bt, beds, baths, halls, kits, flrs, style, ori)
    with get_db() as db:
        cur = db.execute("""INSERT INTO projects
            (user_id,plot_length,plot_width,building_type,bedrooms,bathrooms,
             halls,kitchens,floors,design_style,orientation,design_data)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (session["user_id"], pl, pw, bt, beds, baths, halls, kits, flrs, style, ori, json.dumps(data)))
        db.commit()
    return jsonify({"ok": True, "pid": cur.lastrowid})


# ══════════════════════════════════════════════════════════════════════════════
# DELETE PROJECT
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/project/<int:pid>", methods=["DELETE"])
@login_required
def delete_project(pid):
    with get_db() as db:
        result = db.execute(
            "DELETE FROM projects WHERE id=? AND user_id=?",
            (pid, session["user_id"])
        )
        db.commit()
        if result.rowcount == 0:
            return jsonify({"ok": False, "msg": "Project not found"}), 404
    return jsonify({"ok": True})


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def format_inr(amount):
    if amount >= 10_000_000: return f"₹{amount/10_000_000:.2f} Cr"
    if amount >= 100_000:    return f"₹{amount/100_000:.1f} L"
    return f"₹{amount:,.0f}"

def estimate_cost(total_area, floors, style, bt):
    v1_base = {"Modern":1900,"Traditional":1600,"Minimalist":2000,"Contemporary":2000}.get(style,1900)
    v2_base = round(v1_base * 1.30)
    bt_mult = {"Residential":1.00,"Commercial":1.30,"Villa":1.40,"Apartment":1.10}.get(bt,1.00)
    fl_mult = {2:0.94, 3:0.90, 4:0.87, 5:0.87}.get(floors, 1.0)
    area    = total_area * floors
    def calc(rate):
        r  = round(rate * bt_mult * fl_mult)
        lo = round(area * r * 0.90 / 50000) * 50000
        hi = round(area * r * 1.10 / 50000) * 50000
        return {"rate_per_sqft":r,"area":round(area),"low":lo,"high":hi,
                "low_fmt":format_inr(lo),"high_fmt":format_inr(hi)}
    return {"v1":calc(v1_base),"v2":calc(v2_base)}

def get_vastu(ori, beds, baths, floors):
    tips=[]
    dir_map={
        "East":      "🟢 East-facing main entrance is highly auspicious — it invites morning sunlight and positive solar energy (Surya energy), promoting prosperity and good health.",
        "North":     "🟢 North-facing entrance is excellent — governed by Kubera (lord of wealth), it attracts financial growth and career opportunities.",
        "North-East":"🟢 North-East (Ishan corner) entrance is the most sacred in Vastu — keep this zone open and clutter-free for maximum positive energy.",
        "South":     "🔴 South-facing entrance requires Vastu correction — place a Vastu pyramid near the main door and ensure the door opens clockwise.",
        "West":      "🟡 West-facing entrance is acceptable — avoid placing it in the South-West corner; prefer the North-West side of the West wall.",
        "South-West":"🔴 South-West facing entrance is least favourable — install copper Vastu strips on the threshold and keep the entrance well-lit.",
        "South-East":"🟡 South-East entrance is moderate — use a green doormat and bright lighting; avoid dark colours on the main door.",
        "North-West":"🟡 North-West entrance brings social energy — ensure the door is solid wood and opens inward for stability.",
    }
    for key, tip in dir_map.items():
        if key in ori: tips.append(tip); break
    tips.append("🛋️ Living room is best placed in the North, North-East, or East zone — these directions receive maximum natural light and positive prana, ideal for family gatherings.")
    tips.append("🛏️ Master bedroom belongs in the South-West corner — this is the zone of earth element (Prithvi), providing stability, restful sleep, and strong relationships. Head should point South or East while sleeping.")
    if beds > 1:
        tips.append("👶 Children's bedrooms are ideal in the West or North-West zone — promotes creativity, focus, and academic success. Avoid the South-East direction.")
    tips.append("🍳 Kitchen must be in the South-East (Agni corner) — this is the fire element zone. The cook should face East while cooking. Never place kitchen in the North-East.")
    if baths >= 1:
        tips.append("🚿 Bathrooms are best placed in the North-West or West — never in the North-East (Ishan corner) or South-West, as it disrupts energy flow and health.")
    if floors > 1:
        tips.append("🪜 Staircase should be in the South, South-West, or West — always climb clockwise. Never build a staircase in the North-East as it blocks wealth energy.")
    tips.append("🪟 Maximize windows on the North and East walls — morning sunlight from the East energises the home while North windows allow steady, cool light.")
    tips.append("🕯️ Consider adding a Puja room in the North-East corner — the most spiritually charged direction in Vastu. Keep this space clean, well-lit, and clutter-free.")
    return tips[:10]

def get_extra_rooms(rooms, beds, baths, halls, kits):
    auto = {"stair","corridor","porch","foyer","store","utility","garden","terrace","balcony","garage","dining","study","office"}
    return [f"{r['name']} ({r['sqft']} sqft)" for r in rooms if r["type"] in auto]


# ══════════════════════════════════════════════════════════════════════════════
# FLOOR PLAN ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def make_plans(pl, pw, bt, beds, baths, halls, kits, floors, style, ori):
    total = round(pl * pw, 1)
    C = {"living":"#00b894","lounge":"#00b894","master":"#6c5ce7","bed":"#0984e3",
         "bath":"#a29bfe","powder":"#d63031","kitchen":"#fdcb6e","dining":"#e17055",
         "study":"#74b9ff","office":"#38bdf8","garden":"#55efc4","terrace":"#a3e635",
         "garage":"#636e72","stair":"#b2bec3","balcony":"#fd79a8","store":"#b2bec3",
         "utility":"#81ecec","corridor":"#fd79a8","porch":"#ffeaa7","foyer":"#ffeaa7"}
    def R(name,t,x,y,w,h):
        return {"name":name,"type":t,"color":C.get(t,"#888"),
                "x":round(x,2),"y":round(y,2),"w":round(w,2),"h":round(h,2),
                "sqft":round((w/100)*pl*(h/100)*pw)}
    SP = {"Modern":dict(lw=42,top_h=44,corr=True),
          "Traditional":dict(lw=38,top_h=40,corr=True),
          "Minimalist":dict(lw=48,top_h=50,corr=False),
          "Contemporary":dict(lw=44,top_h=46,corr=False)}
    sp=SP.get(style,SP["Modern"]); lw=sp["lw"]; top_h=sp["top_h"]

    def v1_g0():
        rs=[]; kh=100-top_h-12
        rs.append(R("Living Hall","living",0,0,lw,top_h))
        rs.append(R("Kitchen","kitchen",0,top_h,lw,kh))
        if style=="Traditional":
            rs.append(R("Store Room","store",0,top_h+kh,lw*.5,12))
            rs.append(R("Utility","utility",lw*.5,top_h+kh,lw*.5,12))
        elif style=="Minimalist": rs.append(R("Open Garden","garden",0,top_h+kh,lw,12))
        else: rs.append(R("Utility / Store","store",0,top_h+kh,lw,12))
        cw=32; nb=max(1,min(beds,3)); bh=100.0/nb
        for i in range(nb):
            rs.append(R("Master Bedroom" if i==0 else f"Bedroom {i+1}","master" if i==0 else "bed",lw,i*bh,cw,bh))
        rw=100-lw-cw; nb2=max(1,min(baths,3)); rbh=min(28,70.0/nb2); used=0
        for i in range(nb2):
            rs.append(R(f"Bath {i+1}" if nb2>1 else "Bathroom","bath",lw+cw,used,rw,rbh)); used+=rbh
        if sp["corr"] and used<80: rs.append(R("Corridor","corridor",lw+cw,used,rw,12)); used+=12
        if used<100: rs.append(R("Entrance Porch","porch",lw+cw,used,rw,100-used))
        if floors>1: rs.append(R("Staircase","stair",lw,top_h-14,cw*.44,14))
        return rs

    def v1_upper(f):
        rs=[]
        if f==1:
            rs+=[R("Family Lounge","lounge",0,0,44,46),R("Master Suite","master",44,0,56,46),
                 R("Balcony","balcony",0,46,40,16),R("Bathroom","bath",40,46,30,20),
                 R("Bath 2","bath",70,46,30,20),R("Bedroom 2","bed",0,62,50,38),
                 R("Bedroom 3","bed",50,62,50,38),R("Staircase","stair",43,44,18,14)]
        elif f==2:
            rs+=[R("Study Room","study",0,0,35,44),R("Home Office","office",35,0,35,44),
                 R("Bathroom","bath",70,0,30,38),R("Powder Room","powder",70,38,30,16),
                 R("Bedroom 4","bed",0,44,48,38),R("Bedroom 5","bed",48,44,52,38),
                 R("Terrace","terrace",0,82,100,18),R("Staircase","stair",43,42,18,14)]
        elif f==3:
            rs+=[R("Entertainment","lounge",0,0,58,48),R("Gym","study",58,0,42,48),
                 R("Bathroom","bath",0,48,30,30),R("Bedroom 6","bed",30,48,38,30),
                 R("Bedroom 7","bed",68,48,32,30),R("Open Terrace","terrace",0,78,100,22),
                 R("Staircase","stair",43,46,18,14)]
        elif f==4:
            rs+=[R("Sky Lounge","lounge",0,0,55,52),R("Rooftop Bath","bath",55,0,25,40),
                 R("Storage","store",80,0,20,40),R("Open Deck","terrace",55,40,45,28),
                 R("Rooftop Garden","garden",0,52,100,48),R("Staircase","stair",43,50,18,14)]
        return rs

    def v2_g0():
        rs=[]; lv=55; sv=25; pv=20
        rs.append(R("Grand Living","living",0,0,lv,top_h))
        rs.append(R("Library" if style=="Traditional" else "Study","study",lv,0,sv,top_h))
        rs.append(R("Powder Room","powder",lv+sv,0,pv,top_h))
        mh=22; my=top_h; kw=40
        rs.append(R("Kitchen","kitchen",0,my,kw,mh))
        if style=="Minimalist":
            rs+=[R("Open Dining","dining",kw,my,38,mh),R("Garden","garden",kw+38,my,22,mh)]
        elif style=="Traditional":
            rs+=[R("Dining Room","dining",kw,my,28,mh),R("Garden / Lawn","garden",kw+28,my,32,mh)]
        else:
            rs+=[R("Dining","dining",kw,my,32,mh),R("Garden","garden",kw+32,my,28,mh)]
        cy=my+mh; ch=8; rs.append(R("Corridor","corridor",0,cy,100,ch))
        by=cy+ch; bh=100-by; nb=max(1,min(beds,3)); bw=100.0/(nb+min(baths,2))
        for i in range(nb):
            rs.append(R("Master Suite" if i==0 else f"Suite {i+1}","master" if i==0 else "bed",i*bw,by,bw,bh))
        for i in range(min(baths,2)):
            rs.append(R(f"Bath {i+1}","bath",nb*bw+i*(100-nb*bw)/2,by,(100-nb*bw)/2,bh))
        if floors>1: rs.append(R("Staircase","stair",44,cy-1,14,ch+2))
        return rs

    def v2_upper(f):
        rs=[]
        if f==1:
            rs+=[R("Sky Lounge","lounge",0,0,50,50),R("Master Suite","master",50,0,50,50),
                 R("Ensuite Bath","bath",50,50,24,24),R("Walk-in Closet","store",74,50,26,24),
                 R("Balcony","balcony",0,50,50,18),R("Bedroom","bed",0,68,33,32),
                 R("Bedroom 2","bed",33,68,34,32),R("Bathroom","bath",67,68,33,32),
                 R("Staircase","stair",44,48,14,14)]
        elif f==2:
            rs+=[R("Zen Lounge","lounge",0,0,40,40),R("Spa Bath","bath",40,0,30,40),
                 R("Reading Room","study",70,0,30,40),R("Suite A","master",0,40,35,38),
                 R("Suite B","bed",35,40,33,38),R("Suite C","bed",68,40,32,38),
                 R("Sky Garden","garden",0,78,60,22),R("Bathroom","bath",60,78,40,22),
                 R("Staircase","stair",44,38,14,14)]
        elif f==3:
            rs+=[R("Penthouse Living","lounge",0,0,65,52),R("Master Retreat","master",65,0,35,52),
                 R("Ensuite","bath",65,52,35,22),R("Private Terrace","terrace",0,52,65,22),
                 R("Rooftop Bar","lounge",0,74,50,26),R("Jacuzzi Deck","bath",50,74,50,26),
                 R("Staircase","stair",44,50,14,14)]
        elif f==4:
            rs+=[R("Sky Villa Living","lounge",0,0,100,38),R("Sky Bedroom","master",0,38,40,34),
                 R("Sky Bath","bath",40,38,24,34),R("Open Deck","terrace",64,38,36,34),
                 R("Sky Garden","garden",0,72,100,28),R("Staircase","stair",44,36,14,14)]
        return rs

    v1f=[v1_g0()]+[v1_upper(f) for f in range(1,floors)]
    v2f=[v2_g0()]+[v2_upper(f) for f in range(1,floors)]

    PRIMARY={"living","lounge","master","bed","kitchen","dining"}
    SERVICE={"bath","powder","corridor","stair","porch","foyer","store","utility","garage"}
    def eff(rooms):
        p=sum(r["sqft"] for r in rooms if r["type"] in PRIMARY)
        s=sum(r["sqft"] for r in rooms if r["type"] in SERVICE)
        return min(95,max(40,round(p/(p+s)*100))) if (p+s)>0 else 0

    costs=estimate_cost(total,floors,style,bt)
    vastu=get_vastu(ori,beds,baths,floors)
    v1e=eff(v1f[0]); v2e=max(40,eff(v2f[0])-8)
    ex1=get_extra_rooms(v1f[0],beds,baths,halls,kits)
    ex2=get_extra_rooms(v2f[0],beds,baths,halls,kits)

    ai1=(f"Variation 1 — Compact Functional Design: This {style} {bt} on a {pl}×{pw} ft plot ({total} sqft) "
         f"across {floors} floor(s) follows a disciplined three-column layout. The left column houses the "
         f"Living Hall and Kitchen for efficient workflow. The centre accommodates {beds} bedroom(s) with "
         f"clear zoning. The right column provides bathrooms and an entrance porch for privacy. "
         f"Utility spaces are tucked at the rear. Each upper floor introduces unique layouts — lounges, "
         f"study rooms, terraces — maximising the vertical footprint with clean, practical space flow.")

    ai2=(f"Variation 2 — Luxury Open-Concept Design: This premium {style} {bt} spans {pl}×{pw} ft "
         f"({total} sqft) across {floors} floor(s) with expansive horizontal zoning. A Grand Living area "
         f"dominates the top zone, paired with a study and powder room. A dedicated Kitchen, Dining, and "
         f"Garden band creates a seamless indoor-outdoor connection. A corridor transitions to {beds} "
         f"premium suite(s) with ensuite bathrooms. Upper floors elevate the luxury — sky lounges, "
         f"spa baths, private terraces, and penthouse-level spaces for aspirational living.")

    return {"total_area":total,"plot_length":pl,"plot_width":pw,"floors":floors,
            "style":style,"orientation":ori,"building_type":bt,"vastu_tips":vastu,
            "variations":[
                {"id":1,"name":"Compact Efficient","desc":"Maximized space utilization with functional zoning",
                 "efficiency":v1e,"rooms":v1f[0],"floors_data":v1f,"ai_summary":ai1,
                 "cost":costs["v1"],"extra_rooms":ex1},
                {"id":2,"name":"Luxury Spacious","desc":"Premium open-concept living with dedicated zones",
                 "efficiency":v2e,"rooms":v2f[0],"floors_data":v2f,"ai_summary":ai2,
                 "cost":costs["v2"],"extra_rooms":ex2},
            ]}


# ══════════════════════════════════════════════════════════════════════════════
# API – projects list
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/projects")
@login_required
def api_projects():
    days = int(request.args.get("period", "30"))
    with get_db() as db:
        rows = db.execute("""SELECT id,plot_length,plot_width,building_type,
            bedrooms,bathrooms,floors,design_style,orientation,design_data,created_at
            FROM projects WHERE user_id=? AND created_at>=datetime('now',?)
            ORDER BY created_at DESC""",
            (session["user_id"], f"-{days} days")).fetchall()
    result = []
    for r in rows:
        row = dict(r)
        try:
            dd = json.loads(row.pop("design_data", "{}"))
            row["total_rooms"] = len(dd.get("variations", [{}])[0].get("rooms", []))
            row["total_area"]  = round(dd.get("total_area", row["plot_length"] * row["plot_width"]))
        except:
            row["total_rooms"] = 0
            row["total_area"]  = round(row.get("plot_length", 0) * row.get("plot_width", 0))
        result.append(row)
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, port=5000)