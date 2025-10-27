// FOR IMAGES
document.addEventListener('DOMContentLoaded', ()=>{
    document.querySelectorAll("img").forEach(img=>{
        img.oncontextmenu = ()=>{
            return false;
        }
    })
})

var loader = document.getElementById("loader");
var links = document.querySelectorAll('a');
var form = document.getElementById("form");
var log = document.getElementById("log");
var ct = document.getElementById("contact");

var f = document.querySelectorAll('form');

loader.style.display = "none";

links.forEach(link =>{
    link.addEventListener('click', ()=>{
        loader.style.display = "flex";
    })
})

f.forEach(ff =>{
    ff.addEventListener('submit', (e)=>{
        loader.style.display = "flex";
    })
})

window.addEventListener("pageshow", ()=>{
    loader.style.display = "none";
})



document.getElementById('contact').addEventListener('submit', ()=>{
    loader.style.display = "none";
})

