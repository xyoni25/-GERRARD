(function(){
  "use strict";

  var config = window.GERRARD_SUPABASE_CONFIG || {};
  var authPanel = document.getElementById("member-auth-panel");
  var accountPanel = document.getElementById("member-account-panel");
  var authForm = document.getElementById("member-auth-form");
  var status = document.getElementById("member-status");
  var modeToggle = document.getElementById("member-mode-toggle");
  var submitButton = document.getElementById("member-submit");
  var configNotice = document.getElementById("member-config-notice");
  var configMessage = document.getElementById("member-config-message");
  var accountEmail = document.getElementById("member-account-email");
  var membershipStatus = document.getElementById("membership-status");
  var codeForm = document.getElementById("member-code-form");
  var codeInput = document.getElementById("member-code");
  var codeSubmit = document.getElementById("member-code-submit");
  var signOutButton = document.getElementById("member-sign-out");
  var enterSite = document.getElementById("member-enter-site");
  var receiptWorkflow = document.getElementById("receipt-workflow");
  var redeemBlock = document.getElementById("redeem-block");
  var receiptForm = document.getElementById("receipt-form");
  var receiptInput = document.getElementById("receipt-file");
  var receiptDrop = document.getElementById("receipt-drop");
  var receiptPreview = document.getElementById("receipt-preview");
  var receiptPreviewImage = document.getElementById("receipt-preview-image");
  var receiptFileName = document.getElementById("receipt-file-name");
  var receiptFileSize = document.getElementById("receipt-file-size");
  var receiptRemove = document.getElementById("receipt-remove");
  var receiptSubmit = document.getElementById("receipt-submit");
  var receiptList = document.getElementById("receipt-list");
  var receiptListState = document.getElementById("receipt-list-state");
  var isSignUp = false;
  var client;
  var selectedReceipt = null;
  var previewUrl = null;
  var isUploading = false;
  var maxReceiptBytes = 5 * 1024 * 1024;
  var allowedReceiptTypes = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  function showMessage(message, isError){
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }

  function setBusy(isBusy){
    submitButton.disabled = isBusy;
    submitButton.textContent = isBusy ? "Please wait…" : (isSignUp ? "Create account" : "Sign in");
  }

  function showUnavailable(message){
    authPanel.hidden = false;
    configNotice.hidden = false;
    configMessage.textContent = message;
    authForm.querySelectorAll("input, button").forEach(function(control){
      control.disabled = true;
    });
    modeToggle.disabled = true;
    showMessage("", false);
  }

  function setAccessCookie(session){
    if(session && session.access_token){
      document.cookie = "gerrard_access_token=" + encodeURIComponent(session.access_token) +
        "; Path=/; Max-Age=3600; SameSite=Lax; Secure";
    } else {
      document.cookie = "gerrard_access_token=; Path=/; Max-Age=0; SameSite=Lax; Secure";
    }
  }

  function clearReceiptPreview(){
    selectedReceipt = null;
    receiptInput.value = "";
    receiptPreview.hidden = true;
    receiptPreviewImage.removeAttribute("src");
    receiptFileName.textContent = "";
    receiptFileSize.textContent = "";
    receiptSubmit.disabled = true;
    if(previewUrl){
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
  }

  function fileSizeLabel(size){
    return size >= 1024 * 1024
      ? (size / (1024 * 1024)).toFixed(2) + " MB"
      : Math.max(1, Math.round(size / 1024)) + " KB";
  }

  function chooseReceipt(file){
    if(!file || isUploading) return;
    if(!Object.prototype.hasOwnProperty.call(allowedReceiptTypes, file.type)){
      clearReceiptPreview();
      showMessage("Choose a JPEG, PNG, or WebP image.", true);
      return;
    }
    if(file.size === 0 || file.size > maxReceiptBytes){
      clearReceiptPreview();
      showMessage(file.size === 0 ? "That image is empty. Choose another receipt." : "That image is larger than 5 MB. Choose a smaller receipt.", true);
      return;
    }
    if(previewUrl) URL.revokeObjectURL(previewUrl);
    selectedReceipt = file;
    previewUrl = URL.createObjectURL(file);
    receiptPreviewImage.src = previewUrl;
    receiptFileName.textContent = file.name;
    receiptFileSize.textContent = fileSizeLabel(file.size);
    receiptPreview.hidden = false;
    receiptSubmit.disabled = false;
    showMessage("", false);
  }

  function getRandomObjectName(extension){
    if(!window.crypto || typeof window.crypto.getRandomValues !== "function"){
      throw new Error("Secure file naming is unavailable in this browser. Please update your browser and try again.");
    }
    if(typeof window.crypto.randomUUID === "function"){
      return window.crypto.randomUUID() + "." + extension;
    }
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function(byte){
      return byte.toString(16).padStart(2, "0");
    }).join("") + "." + extension;
  }

  async function hasAllowedImageSignature(file){
    var bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    var isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    var isPng = bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
    var isWebp = bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    return (file.type === "image/jpeg" && isJpeg) ||
      (file.type === "image/png" && isPng) ||
      (file.type === "image/webp" && isWebp);
  }

  function formatDate(value){
    var date = new Date(value);
    if(isNaN(date.getTime())) return "Date unavailable";
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function receiptStatusLabel(value){
    if(value === "approved") return { label: "Receipt verified", className: "approved" };
    if(value === "rejected") return { label: "Follow-up needed", className: "rejected" };
    return { label: "Pending review", className: "pending" };
  }

  async function loadReceipts(){
    receiptList.replaceChildren();
    receiptListState.textContent = "Loading your submissions…";
    var result = await client
      .from("receipt_submissions")
      .select("id,status,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if(result.error){
      receiptListState.textContent = "Your submission history could not be loaded. Please refresh to try again.";
      return;
    }
    if(!result.data || result.data.length === 0){
      receiptListState.textContent = "No receipts submitted yet.";
      return;
    }
    receiptListState.textContent = "";
    result.data.forEach(function(receipt){
      var item = document.createElement("li");
      item.className = "receipt-list-item";
      var details = document.createElement("div");
      var title = document.createElement("strong");
      title.textContent = "Payment receipt";
      var date = document.createElement("time");
      date.dateTime = receipt.created_at;
      date.textContent = formatDate(receipt.created_at);
      var receiptStatus = receiptStatusLabel(receipt.status);
      var badge = document.createElement("span");
      badge.className = "receipt-state " + receiptStatus.className;
      badge.textContent = receiptStatus.label;
      details.appendChild(title);
      details.appendChild(date);
      item.appendChild(details);
      item.appendChild(badge);
      receiptList.appendChild(item);
    });
  }

  async function showAccount(user){
    authPanel.hidden = Boolean(user);
    accountPanel.hidden = !user;
    codeForm.hidden = true;
    redeemBlock.hidden = true;
    receiptWorkflow.hidden = !user;
    enterSite.hidden = true;
    status.textContent = "";
    if(!user){
      clearReceiptPreview();
      receiptList.replaceChildren();
      receiptListState.textContent = "Sign in to see your submissions.";
      return;
    }

    accountEmail.textContent = user.email || "";
    membershipStatus.textContent = "Checking your access…";
    var result = await client
      .from("memberships")
      .select("user_id,expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if(result.error) throw result.error;
    if(!result.data){
      membershipStatus.textContent = "No access code has been redeemed on this account yet. Your receipt will be reviewed manually; payment does not unlock access automatically.";
      redeemBlock.hidden = false;
      codeForm.hidden = false;
      await loadReceipts();
      return;
    }

    var expiresAt = result.data.expires_at;
    if(expiresAt === null){
      membershipStatus.textContent = "Your legacy portfolio access remains active with no expiration date. If you make another payment, redeeming its code will start a new term-based access period.";
      enterSite.hidden = false;
      redeemBlock.hidden = false;
      codeForm.hidden = false;
    }else{
      var expiryTime = Date.parse(expiresAt);
      if(!Number.isFinite(expiryTime)) throw new Error("Your access expiration could not be checked. Please try again.");
      if(expiryTime <= Date.now()){
        membershipStatus.textContent = "Your portfolio access expired on " + formatDate(expiresAt) + ". After another verified one-time payment, redeem your new code here to renew.";
        redeemBlock.hidden = false;
        codeForm.hidden = false;
      }else{
        membershipStatus.textContent = "Your portfolio access is active until " + formatDate(expiresAt) + ". Renew manually with another payment and code; there are no recurring charges.";
        enterSite.hidden = false;
        redeemBlock.hidden = false;
        codeForm.hidden = false;
      }
    }
    await loadReceipts();
  }

  async function refreshAccount(user){
    try{
      await showAccount(user);
    }catch(error){
      membershipStatus.textContent = "We could not check your account access. Please try again.";
      showMessage(error.message || "Membership lookup failed.", true);
    }
  }

  function setMode(signUp){
    isSignUp = signUp;
    submitButton.textContent = isSignUp ? "Create account" : "Sign in";
    modeToggle.textContent = isSignUp
      ? "Already registered? Sign in"
      : "New customer? Create an account";
    document.getElementById("member-password").autocomplete = isSignUp ? "new-password" : "current-password";
    showMessage("", false);
  }

  function initPageControls(){
    var themeToggle = document.getElementById("themeToggle");
    if(themeToggle){
      themeToggle.addEventListener("click", function(){
        var root = document.documentElement;
        var isDark = root.getAttribute("data-theme") === "dark";
        var next = isDark ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try{ localStorage.setItem("gerrard-theme", next); }catch(error){}
      });
    }

    var navToggle = document.getElementById("navToggle");
    var mobilePanel = document.getElementById("mobilePanel");
    if(navToggle && mobilePanel){
      navToggle.addEventListener("click", function(){
        navToggle.classList.toggle("open");
        mobilePanel.classList.toggle("open");
      });
      mobilePanel.querySelectorAll("a").forEach(function(link){
        link.addEventListener("click", function(){
          navToggle.classList.remove("open");
          mobilePanel.classList.remove("open");
        });
      });
    }

    document.querySelectorAll("[data-year]").forEach(function(element){
      element.textContent = new Date().getFullYear();
    });
  }

  function initReceiptControls(){
    receiptInput.addEventListener("change", function(){
      chooseReceipt(receiptInput.files && receiptInput.files[0]);
    });
    receiptRemove.addEventListener("click", function(){
      if(isUploading) return;
      clearReceiptPreview();
      showMessage("", false);
    });
    receiptDrop.addEventListener("keydown", function(event){
      if(event.key === "Enter" || event.key === " "){
        event.preventDefault();
        receiptInput.click();
      }
    });
    ["dragenter", "dragover"].forEach(function(eventName){
      receiptDrop.addEventListener(eventName, function(event){
        event.preventDefault();
        receiptDrop.classList.add("is-dragging");
      });
    });
    ["dragleave", "drop"].forEach(function(eventName){
      receiptDrop.addEventListener(eventName, function(event){
        event.preventDefault();
        receiptDrop.classList.remove("is-dragging");
      });
    });
    receiptDrop.addEventListener("drop", function(event){
      chooseReceipt(event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]);
    });

    receiptForm.addEventListener("submit", async function(event){
      event.preventDefault();
      if(!selectedReceipt || !receiptForm.reportValidity()) return;
      var fileToUpload = selectedReceipt;
      isUploading = true;
      receiptInput.disabled = true;
      receiptRemove.disabled = true;
      receiptSubmit.disabled = true;
      receiptSubmit.textContent = "Uploading receipt…";
      showMessage("Uploading your receipt securely. Please keep this page open.", false);
      var objectPath;
      try{
        var userResult = await client.auth.getUser();
        if(userResult.error) throw userResult.error;
        var user = userResult.data.user;
        if(!user) throw new Error("Please sign in again before submitting a receipt.");

        if(!(await hasAllowedImageSignature(fileToUpload))){
          throw new Error("The selected file does not match its image type. Choose a valid JPEG, PNG, or WebP receipt.");
        }
        var extension = allowedReceiptTypes[fileToUpload.type];
        objectPath = user.id + "/" + getRandomObjectName(extension);
        var uploadResult = await client.storage
          .from("payment-receipts")
          .upload(objectPath, fileToUpload, {
            cacheControl: "0",
            contentType: fileToUpload.type,
            upsert: false
          });
        if(uploadResult.error) throw uploadResult.error;

        var insertResult = await client
          .from("receipt_submissions")
          .insert({
            user_id: user.id,
            object_path: objectPath,
            content_type: fileToUpload.type,
            file_size_bytes: fileToUpload.size
          });
        if(insertResult.error){
          var cleanupResult = await client.storage.from("payment-receipts").remove([objectPath]);
          if(cleanupResult.error){
            throw new Error("The receipt record could not be saved, and its private file could not be removed. Please contact the site owner before retrying.");
          }
          throw insertResult.error;
        }

        clearReceiptPreview();
        await loadReceipts();
        showMessage("Receipt submitted for manual review. Payment is not approved and access is not unlocked until you receive and redeem your personal code.", false);
      }catch(error){
        showMessage(error.message || "We could not submit your receipt. Please try again.", true);
      }finally{
        isUploading = false;
        receiptInput.disabled = false;
        receiptRemove.disabled = false;
        receiptSubmit.textContent = "Submit for manual review";
        receiptSubmit.disabled = !selectedReceipt;
      }
    });
  }

  initPageControls();
  initReceiptControls();

  if(!config.url || !config.anonKey){
    showUnavailable("The secure sign-in and receipt service has not been configured. No account or receipt can be submitted right now.");
    return;
  }

  if(!window.supabase || typeof window.supabase.createClient !== "function"){
    showUnavailable("The secure sign-in service could not be loaded. No account or receipt can be submitted right now. Please try again later or contact @xyoni for an update.");
    return;
  }

  client = window.supabase.createClient(config.url, config.anonKey);
  modeToggle.addEventListener("click", function(){
    setMode(!isSignUp);
  });

  authForm.addEventListener("submit", async function(event){
    event.preventDefault();
    if(!authForm.reportValidity()) return;

    setBusy(true);
    showMessage("", false);
    var email = document.getElementById("member-email").value.trim();
    var password = document.getElementById("member-password").value;
    try{
      if(isSignUp){
        var signUpResult = await client.auth.signUp({
          email: email,
          password: password,
          options: { emailRedirectTo: window.location.origin + "/members.html" }
        });
        if(signUpResult.error) throw signUpResult.error;
        if(signUpResult.data.session){
          setAccessCookie(signUpResult.data.session);
          await refreshAccount(signUpResult.data.user);
        } else {
          showMessage("Account created. Check your email to confirm it, then sign in here to submit your payment receipt.", false);
        }
      } else {
        var signInResult = await client.auth.signInWithPassword({ email: email, password: password });
        if(signInResult.error) throw signInResult.error;
        setAccessCookie(signInResult.data.session);
        await refreshAccount(signInResult.data.user);
      }
    }catch(error){
      showMessage(error.message || "We could not complete that request.", true);
    }finally{
      setBusy(false);
    }
  });

  codeForm.addEventListener("submit", async function(event){
    event.preventDefault();
    if(!codeForm.reportValidity()) return;

    codeSubmit.disabled = true;
    codeSubmit.textContent = "Redeeming code…";
    showMessage("", false);
    try{
      var result = await client.rpc("redeem_access_code", {
        p_code: codeInput.value.trim()
      });
      if(result.error) throw result.error;
      if(result.data !== true){
        showMessage("That code is invalid, expired, or has already been used.", true);
        return;
      }
      codeForm.reset();
      var userResult = await client.auth.getUser();
      if(userResult.error) throw userResult.error;
      if(!userResult.data.user) throw new Error("Please sign in again before checking your access.");
      await refreshAccount(userResult.data.user);
    }catch(error){
      showMessage(error.message || "We could not redeem that code. Please try again.", true);
    }finally{
      codeSubmit.disabled = false;
      codeSubmit.textContent = "Redeem code";
    }
  });

  signOutButton.addEventListener("click", async function(){
    signOutButton.disabled = true;
    try{
      var result = await client.auth.signOut();
      if(result.error) throw result.error;
      setAccessCookie(null);
      await showAccount(null);
      showMessage("You have signed out.", false);
    }catch(error){
      showMessage(error.message || "Sign out failed.", true);
    }finally{
      signOutButton.disabled = false;
    }
  });

  client.auth.onAuthStateChange(function(event, session){
    setAccessCookie(session);
    if(event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED"){
      window.setTimeout(function(){
        refreshAccount(session ? session.user : null);
      }, 0);
    }
  });

  client.auth.getSession().then(function(result){
    if(result.error) throw result.error;
    setAccessCookie(result.data.session);
    return refreshAccount(result.data.session ? result.data.session.user : null);
  }).catch(function(error){
    showMessage(error.message || "We could not check your sign-in status.", true);
  });
})();
