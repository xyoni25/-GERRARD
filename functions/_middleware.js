var PUBLIC_PATHS = new Set([
  "/members.html",
  "/assets/css/style.css",
  "/assets/js/access-gate.js",
  "/assets/js/supabase-config.js",
  "/assets/js/member-access.js"
]);

function redirectToAccess(request){
  var url = new URL(request.url);
  return new Response(null, {
    status: 302,
    headers: {
      "Cache-Control": "no-store",
      "Location": new URL("/members.html", url.origin).toString()
    }
  });
}

function unavailable(){
  return new Response("Portfolio access is temporarily unavailable. Please try again later.", {
    status: 503,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

function getAccessToken(request){
  var cookieHeader = request.headers.get("Cookie") || "";
  var cookies = cookieHeader.split(";");
  for(var i = 0; i < cookies.length; i++){
    var separator = cookies[i].indexOf("=");
    if(separator < 0 || cookies[i].slice(0, separator).trim() !== "gerrard_access_token") continue;
    try{
      return decodeURIComponent(cookies[i].slice(separator + 1).trim());
    }catch(error){
      return null;
    }
  }
  return null;
}

function noStore(response){
  var headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

export async function onRequest(context){
  var request = context.request;
  var path = new URL(request.url).pathname;
  if(PUBLIC_PATHS.has(path)) return context.next();

  var token = getAccessToken(request);
  if(!token) return redirectToAccess(request);

  var supabaseUrl = (context.env.SUPABASE_URL || "").replace(/\/+$/, "");
  var anonKey = context.env.SUPABASE_ANON_KEY || "";
  if(!supabaseUrl || !anonKey) return unavailable();

  var headers = {
    "apikey": anonKey,
    "Authorization": "Bearer " + token
  };

  try{
    var membershipUrl = new URL(supabaseUrl + "/rest/v1/memberships");
    membershipUrl.searchParams.set("select", "user_id");
    membershipUrl.searchParams.set("limit", "1");
    var membershipResponse = await fetch(membershipUrl.toString(), {
      headers: headers
    });
    if(membershipResponse.status === 401){
      return redirectToAccess(request);
    }
    if(!membershipResponse.ok) return unavailable();

    var memberships = await membershipResponse.json();
    if(!Array.isArray(memberships)) return unavailable();
    if(memberships.length === 0) return redirectToAccess(request);

    return noStore(await context.next());
  }catch(error){
    return unavailable();
  }
}
