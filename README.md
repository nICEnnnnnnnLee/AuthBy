<p align="center">
      <strong>
        <a href="https://github.com/nICEnnnnnnnLee/GithubSoEasy" target="_blank">AuthBy</a>&nbsp;
      </strong>
  <br>
        AuthBy, 使用Cloudflare Workers 实现Github授权获取
  <br>
      源自<strong>
        <a href="https://github.com/ButterAndButterfly" target="_blank">ButterAndButterfly</a><br>
      </strong>  
        Butter, 寓意宅男; Butterfly, 寓意美好的事物。 
        <br/> 美好的世界由我们创造!  
</p>


## 使用场景  
在某些情况下，我们并不希望用户不受限制的访问我们的某些服务。  
+ 一个解决思路是： 
  + 访问服务域名`abc.test.com`，根据Cookie判断是否经过授权
    + 是, 提供服务，流程结束
    + 否, 下一步
  + 跳转到授权域名`gitauth.abc.test.com`，访问Github OAuth链接
    + 验证成功，获取code  
    + 验证失败，拒绝服务，流程结束  
  + 根据code访问cookie申请链接
    + 服务端根据code获取Github账户名信息，再加上当前时间戳和盐值，生成哈希值作为cookie返回(域为`.test.com`、`abc.test.com`都可以)
  + 访问服务域名`test.com`

+ 实际上，当scope为空，Github OAuth只能得到基本的用户名，连Email都获取不到，与其说是授权，不如说是认证。  
应该侵犯不了啥权益吧。。。

## 示例Demo
<https://github-auth.s-url.cf/>   
和短网址联动(没有cookie将会进行授权跳转, 当然，分享的短网址不算)：  
<https://s-url.cf/>  

## 前置条件  
+ 你的服务对应的域名解析放置在了Cloudflare
+ 一个Github账号，用于创建Oauth App

## 相关参数
```js
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
```

## 实现步骤
+ 在Github创建一个OAuth app  
    -> [如何创建 OAuth 应用程序](https://docs.github.com/cn/developers/apps/building-oauth-apps/creating-an-oauth-app)
  + 将回调Callback链接设置为`https://${login_domain}${instruction_path}`  
  + 获取`client_id`和`client_secret`  

+ 在Cloudflare创建一个Worker
  + 根据情况修改`index.js`的值，将其内容复制到worker里面
  + 将域名`${login_domain}`绑定到worker

+ 访问`https://${login_domain}${instruction_path}`，测试cookie是否设置成功


## 其它
+ 对cookie进行有效性验证的参考代码

```js
const SALT = '114514BeastManddd'
const COOKIE_NAME = 'h_114514'
const ALGORITHM = 'SHA-256'

async function checkCookie(request){
    const cookieStr = (request.headers.get('Cookie') || '');
    const cookie = {}
    cookieStr.split(';').forEach( data => {
        let p =  data.indexOf('=')
        cookie[data.substr(0, p).trim()] = data.substr(p+1)?.trim()
    })
    if (cookie[COOKIE_NAME] != null) {
        const params = cookie[COOKIE_NAME].split('|', 3)
        if(params.length == 3){
            const currentTime = new Date().getTime()
            const signTime = Number(params[1])
            if(currentTime - signTime < 1000 * 60 * 60 * 8){
                const data2Encrypt = new TextEncoder().encode(params[0] + SALT + params[1])
                const buffer = await crypto.subtle.digest(ALGORITHM, data2Encrypt)
                const hashToken = btoa(String.fromCharCode(...new Uint8Array(buffer)))
                if(hashToken == params[2])
                    return true
            }
        }
    }
    return false;
}
```
