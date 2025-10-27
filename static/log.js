// FOR IMAGES
document.addEventListener('DOMContentLoaded', ()=>{
    document.querySelectorAll("img").forEach(img=>{
        img.oncontextmenu = ()=>{
            return false;
        }
    })
})


// FUNCTIONALITIES FOR SIGN UP PAGE SWICHING
// var form = document.getElementById('form');
// var log = document.getElementById('log');
// var signin = document.getElementById('signin');
// var signup = document.getElementById('signup');
// var header = document.getElementById("header");

// signup.addEventListener('click', ()=>{
//    form.classList.add('active');
//    log.classList.remove('active');
//    header.innerHTML = "cFleet.<br>Route Optimization at your fingertips.<br><br><br>..Sign Up..";
// })

// signin.addEventListener('click', ()=>{
//    log.classList.add('active');
//    form.classList.remove('active');
//    header.innerHTML = "cFleet.<br>Route Optimization at your fingertips.<br><br><br>..Sign In..";
// })

// document.addEventListener('DOMContentLoaded', ()=>{
//     log.classList.add('active');
// })

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



