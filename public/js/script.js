const btn_bible=document.getElementById("btn_bible");
const btn_hymns=document.getElementById("btn_hymns");
const btn_live_graphics=document.getElementById("btn_live_graphics");
const btn_live_controller=document.getElementById("btn_live_controller");
const btn_timer=document.getElementById("btn_timer");
const btn_wallpapers=document.getElementById("btn_wallpapers");
btn_bible.addEventListener("click",function(){
    window.location.href="/plugin/bible";
});
btn_hymns.addEventListener("click",function(){
    window.location.href="/plugin/lyrics";
})
btn_live_graphics.addEventListener("click",function(){
    window.location.href="/plugin/live_graphics/";
})
btn_live_controller.addEventListener("click",function(){
    window.location.href="/plugin/live_controller/";
})
btn_timer.addEventListener("click",function(){
    window.location.href="/plugin/timer/";
})
btn_wallpapers.addEventListener("click",function(){
    window.location.href="/plugin/wallpaper/";
})
const btn_presenter=document.getElementById("btn_presenter");
const btn_presenter_control=document.getElementById("btn_presenter_control");
btn_presenter.addEventListener("click",function(){
    window.location.href="/plugin/presenter/dashboard.html";
})
btn_presenter_control.addEventListener("click",function(){
    window.location.href="/plugin/presenter/";
})