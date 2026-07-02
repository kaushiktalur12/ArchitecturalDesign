from app import app
import re

with app.test_client() as c:
    r = c.get('/home')
    print('home', r.status_code)
    html = r.data.decode('utf-8')
    srcs = re.findall(r'src="([^"]+)"', html)
    imgs = [s for s in srcs if 'images/bg' in s]
    print('img count', len(imgs))
    for i, s in enumerate(imgs, 1):
        rr = c.get(s)
        print(i, s, rr.status_code, rr.content_type if rr.status_code == 200 else 'FAIL')
