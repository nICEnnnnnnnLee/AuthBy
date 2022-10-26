
const login_domain = 'gitauth.abc.test.com'     // 必填项
const cookie_domain = '.test.com'               // 必填项
const client_id = 'abcdefg'                     // 必填项
const client_secret = 'hijklmn'                 // 必填项
const auth_path = '/auth'     // 通过传过来的code查询并生返回cookie
const instruction_path = '/'  // 返回HTML页面

const cookie_name = 'h_114514'
const cookie_path = '/'
const cookie_live_time = 60 * 60
const algorithm = 'SHA-256' // SHA-1 SHA-256 SHA-384 SHA-512
const salt = '114514BeastMan'
const instruction_html = `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Github OAuth 授权页</title>
    <style>
        a:hover {
            text-decoration: underline;
        }

        a {
            color: #275a90;
            text-decoration: none;
        }

        .center {
            width: 100%;
            text-align: center;
            margin-top: 50px;
        }
    </style>
</head>

<body>
    <div class="center">
        <p>请将Github OAuthApp返回地址设置为 https://${login_domain}${instruction_path}</p>
    </div>
    <div class="center">
        <a href="https://github.com/login/oauth/authorize?client_id=${client_id}" target="_blank">Login</a>
    </div>

    <!-- 加载jQuery -->
    <script src="https://code.jquery.com/jquery-1.12.4.min.js"
        integrity="sha256-ZosEbRLbNQzLpnKIkEdrPv7lOy9C27hHQ+Xp8a4MxAQ=" crossorigin="anonymous"></script>
    <script>
        function getQueryVariable(variable) {
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                if (pair[0] == variable) {
                    return pair[1];
                }
            }
            return (false);
        }
        var code = getQueryVariable("code");
        var debug = getQueryVariable("debug");
        console.log(code)
        if (code && !debug) {
            $.get("${auth_path}?code=" + code,
                function (data, status) {
                    alert(JSON.stringify(data));
                    window.location.href = "about:blank";
                    window.close();              
                });

        }

    </script>
</body>

</html>
`
async function fetchAndStream(request) {

  const url = new URL(request.url);
  // 返回HTML页面
  if (url.pathname == instruction_path) {
    return new Response(instruction_html, {
      headers: { "content-type": "text/html;charset=UTF-8" }
    })
  }

  // 返回code
  if (url.pathname == auth_path) {
    let code = url.searchParams.get('code')
    if (code == null) {
      return new Response(JSON.stringify({ code: 20001, msg: 'code 为null' }), {
        headers: {
          'content-type': 'application/json;charset=UTF-8',
        },
        status: 403
      });
    } else {
      let res = await fetch('https://github.com/login/oauth/access_token',
        {
          body: JSON.stringify({ client_id, client_secret, code }),
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'content-type': 'application/json;charset=UTF-8',
          },
        }
      )
      const access_token = (await res.json())['access_token']

      res = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${access_token}`, 'User-Agent': 'GithubMira 1.0.0' },
      })
      const github_id = (await res.json())['login']

      if (github_id) {
        // TODO 你可以在此处做些更复杂的操作
        const time = new Date().getTime()
        const data2Encrypt = new TextEncoder().encode(github_id + salt + time)
        const buffer = await crypto.subtle.digest(algorithm, data2Encrypt)
        const hashToken = btoa(String.fromCharCode(...new Uint8Array(buffer)))
        const cookie_set = `${cookie_name}=${github_id}|${time}|${hashToken}; domain=${cookie_domain}; path=${cookie_path}; max-age=${cookie_live_time}; secure; HttpOnly; SameSite=Lax`
        return new Response(JSON.stringify({ code: 0, msg: `设置了cookie: ${cookie_name}=${github_id}|${time}|${hashToken}` }), {
          headers: {
            'content-type': 'application/json;charset=UTF-8',
            'Set-Cookie': cookie_set
          },
          status: 200
        });
      } else {
        return new Response(JSON.stringify({ code: 20003, msg: '未获取到github信息' }), {
          headers: {
            'content-type': 'application/json;charset=UTF-8',
          },
          status: 403
        });
      }

    }
  }
}

addEventListener("fetch", event => {
  event.respondWith(fetchAndStream(event.request))
})