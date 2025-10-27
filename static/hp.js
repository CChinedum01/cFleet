// FOR IMAGES
document.addEventListener('DOMContentLoaded', ()=>{
    document.querySelectorAll("img").forEach(img=>{
        img.oncontextmenu = ()=>{
            return false;
        }
    })
})

// SCRIPT FOR LINE CLAMP OF DIVISION THREE
var rup = document.querySelectorAll('.rup');
    rup.forEach(rups=>{
    rups.addEventListener('click', ()=>{
    // rups.style.height = "10%";
    rups.classList.toggle('exp');
})
});


// FOR  FOOTER 
document.getElementById('year').textContent = new Date().getFullYear();