(function(){
  "use strict";

  document.documentElement.style.visibility = "hidden";

  function goToUnlock(){
    window.location.replace(new URL("members.html", window.location.href).toString());
  }

  function loadScript(source){
    return new Promise(function(resolve, reject){
      var script = document.createElement("script");
      script.src = source;
      script.onload = resolve;
      script.onerror = function(){
        reject(new Error("Could not load access verification."));
      };
      document.head.appendChild(script);
    });
  }

  async function checkAccess(){
    var config = window.GERRARD_SUPABASE_CONFIG || {};
    if(!config.url || !config.anonKey) throw new Error("Access verification is not configured.");

    if(!window.supabase || typeof window.supabase.createClient !== "function"){
      await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js");
    }

    var client = window.supabase.createClient(config.url, config.anonKey);
    var sessionResult = await client.auth.getSession();
    if(sessionResult.error) throw sessionResult.error;
    if(!sessionResult.data.session) throw new Error("Sign in to access the portfolio.");

    var membershipResult = await client
      .from("memberships")
      .select("user_id")
      .eq("user_id", sessionResult.data.session.user.id)
      .maybeSingle();
    if(membershipResult.error) throw membershipResult.error;
    if(!membershipResult.data) throw new Error("Portfolio access has not been approved.");

    document.documentElement.style.visibility = "";
  }

  loadScript("assets/js/supabase-config.js")
    .then(checkAccess)
    .catch(goToUnlock);
})();
