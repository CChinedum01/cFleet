

// MY CSS ROOT COLOURS
const rootStyles = getComputedStyle(document.documentElement);
const pc = rootStyles.getPropertyValue("--pc").trim();
const sc = rootStyles.getPropertyValue("--sc").trim();
const outl = rootStyles.getPropertyValue("--outl").trim();
const trans = rootStyles.getPropertyValue("--trans").trim();


var f = document.getElementById('f');
var menu = document.getElementById('menu');
var user = document.getElementById('user');
var close = document.getElementById('close');


menu.addEventListener('click', ()=>{
    user.classList.add('active');
})
close.addEventListener('click', ()=>{
    user.classList.remove('active');
})



// FUNCTIONALITIES FOR SIGN UP PAGE TOGGLING VISIBILITY AND CLEARING INPUT
var vis = document.querySelectorAll('.visibility');
var input = document.querySelectorAll("input");
var eye = document.querySelectorAll('.eye');

       vis.forEach((c,index) =>{
        c.addEventListener('click', ()=>{
        let input = c.parentElement.querySelector('input');
        let eye = c.parentElement.querySelector('.eye');
        if(!input) return;
        if(input.type === "password"){
            input.type = "text";
            eye.src = "/Svgs/novisible.png";
        }
        else if(input.type === "text"){
            input.type = "password";
            eye.src = "/Svgs/visible.png";
        };
       
    });
    });

var clear = document.querySelectorAll('.clear');
clear.forEach (cl =>{
    cl.style.display = "none";
    let input = cl.parentElement.querySelector("input");

    input.addEventListener('input', ()=>{
if(input.value.length > 0){
            cl.style.display = "flex";
        }
        else{
            cl.style.display = "none";
        }
    })
    
    cl.addEventListener('click', ()=>{   
        input.value = "";
        cl.style.display = "none";
        input.focus();
    })
})


// FOR PREVENTING SUBMISSION WHEN PASSWORDS DO NOT MATCH
var warn = document.getElementById('warn');
var pw = document.getElementById('pw');
var cpw = document.getElementById('cpw');
var form = document.getElementById('form');


cpw.addEventListener("input", ()=>{
    if(pw.value !== cpw.value){
        cpw.setCustomValidity("Passwords do not match")
    }
    else{
        cpw.setCustomValidity("")
    }
})
form.addEventListener("submit", (e)=>{
    if(pw.value !== cpw.value){
        e.preventDefault();
    }
})


// === NAVIGATION BAR FUNCTIONALITIES ==========================================
const usermgt = document.getElementById('user_management');    // user management section
const overview = document.getElementById('overview-section');  // overview section
const tracking = document.getElementById('tracking-section');  // tracking section
const optimise = document.getElementById('routingSection');    // optimize section

// buttons
const adduser = document.getElementById('new');        // user management button
const overviewbtn = document.getElementById('overview'); // overview button
const trackingbtn = document.getElementById('track');     // tracking button
const optimisebtn = document.getElementById('optimize');  // optimize button



// Helper to show one section and hide others
function showSection(activeBtn, activeSection) {
  // Hide all sections that exist
  [usermgt, overview, tracking, optimise].forEach(sec => {
    if (sec) sec.style.display = "none";
  });

  // Reset all button borders
  [adduser, overviewbtn, trackingbtn, optimisebtn].forEach(btn => {
    if (btn) btn.style.borderColor = trans;
  });

  // Show active section & highlight button
  if (activeSection) activeSection.style.display = "flex";
  if (activeBtn) activeBtn.style.borderColor = sc;
}

// Safely attach click events (only if both button & section exist)
if (adduser && usermgt) {
  adduser.addEventListener('click', () => showSection(adduser, usermgt));
}

if (overviewbtn && overview) {
  overviewbtn.addEventListener('click', () => showSection(overviewbtn, overview));
}

if (trackingbtn && tracking) {
  trackingbtn.addEventListener('click', () => showSection(trackingbtn, tracking));
}

if (optimisebtn && optimise) {
  optimisebtn.addEventListener('click', () => showSection(optimisebtn, optimise));
}










// FUNCTIONALITIES FOR CREATING PROFILE REGISTERING VEHICLE, AND SEARCHING PROFILE
var create = document.getElementById('create_profile');
var register = document.getElementById('register_vehicle');
var vehicle  = document.getElementById('vehicle');
var searchbtn = document.getElementById('searchbtn');
var search_user = document.getElementById('search-section');
// form has already be asigned to a variable above

// ADD USER=================
create.addEventListener('click', ()=>{
    form.style.display = "flex"
    search_user.style.display = "none"
    vehicle.style.display = "none"
    if(form.style.display = "flex"){
        create.style.backgroundColor = pc;
        searchbtn.style.backgroundColor = trans;
        register.style.backgroundColor = trans;
    }
    else{
    create.style.backgroundColor = trans;
    }
})

// ADD VEHICLE===================
register.addEventListener('click', ()=>{
    vehicle.style.display = "flex"
    form.style.display = "none"
    search_user.style.display = "none"
    if(vehicle.style.display = "flex"){
        register.style.backgroundColor = pc;
        create.style.backgroundColor = trans;
        searchbtn.style.backgroundColor = trans;
    }
    else{
    register.style.backgroundColor = trans;
    }
})


// SEARCH===========================
searchbtn.addEventListener('click', ()=>{
    form.style.display = "none"
    vehicle.style.display = "none"
    search_user.style.display = "flex"
    if(search_user.style.display = "flex"){
        searchbtn.style.backgroundColor = pc;
        create.style.backgroundColor = trans;
        register.style.backgroundColor = trans;
    }
    else{
    searchbtn.style.backgroundColor = trans;
    }
})

// FOR LOADING ANIMATION =========================
var f = document.querySelectorAll('form');
f.forEach(ff =>{
    ff.addEventListener('submit', (e)=>{
        loader.style.display = "flex";
    })
})



// ITEMS TO BE ACTIVATED ON PAGE LOAD======================================
document.addEventListener('DOMContentLoaded', ()=>{
    document.querySelectorAll("img").forEach(img=>{ // FOR IMAGES
        img.oncontextmenu = ()=>{
            return false;
        }
    })

// FOR MANAGEMENT SCTION========================
    form.style.display = "flex"
    create.style.backgroundColor = pc;
        searchbtn.style.backgroundColor = trans;
        register.style.backgroundColor = trans;
    
// FOR ROUTING  SECTION=======================
// === DEFAULT VIEW ===
// If user has access to "optimise" (like driver), show it by default.
// Otherwise, fall back to the first available section.
if (optimise) {
  showSection(optimisebtn, optimise);
} else if (overview) {
  showSection(overviewbtn, overview);
} else if (tracking) {
  showSection(trackingbtn, tracking);
} else if (usermgt) {
  showSection(adduser, usermgt);
}


})


