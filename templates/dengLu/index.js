function register(){
    event.preventDefault();
    var zhangHu = document.getElementsByName("zhangHu")[0].value;
    var password = document.getElementsByName("password")[0].value;
    var xhr = new XMLHttpRequest();
    xhr.open("POST","/app/art",true);
    xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            var response = JSON.parse(xhr.responseText);
            if (response.status === "success"){

                window.location.assign('/');
            }else{
                alert(response.message);
            }
        }
    };
    xhr.send("zhangHu=" + encodeURIComponent(zhangHu) + "&password=" + encodeURIComponent(password));
}