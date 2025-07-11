    const fetchButton = document.getElementById('fetchButton');
    const image = document.getElementById('image');

    fetchButton.addEventListener('click', async () => {
    try {
    // 发起 GET 请求
    const response = await fetch('http://9919zo191fl3.vicp.fun/ceshi');
    if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}
    // 解析响应为 JSON 格式
    const data = await response.json();
    // 获取图片文件路径
    const imgPath = data.imgfile;
    // 设置图片的 src 属性
    image.src = imgPath;
} catch (error) {
    console.error('请求出错:', error);
}
});
