function register(){
    event.preventDefault();
    var username = document.getElementsByName('username')[0].value;
    var zhangHu = document.getElementsByName("zhangHu")[0].value;
    var password = document.getElementsByName("password")[0].value;
    var xhr = new XMLHttpRequest();
    xhr.open("POST","/app/art2",true);
    xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            var response = JSON.parse(xhr.responseText);
            if(response.status === "error"){
                alert(response.message);
            }else{
                alert(response.message);
                window.location.assign('/index');
            }
        }
    };
    xhr.send("username=" + encodeURIComponent(username) + "&zhangHu=" + encodeURIComponent(zhangHu) + "&password=" + encodeURIComponent(password));
}