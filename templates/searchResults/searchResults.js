// 获取URL中的搜索关键词
const urlParams = new URLSearchParams(window.location.search);
const query = urlParams.get('q');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultCount = document.getElementById('resultCount');

if (!query) {
    // 无关键词时已在HTML中显示提示，无需额外处理
} else {
    // 显示加载状态
    document.getElementById('searchResultsContainer').innerHTML = '';
    loadingIndicator.classList.remove('hidden');
    loadingIndicator.classList.add('flex');

    // 发送搜索请求
    fetch(`/searchMer?q=${encodeURIComponent(query)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
            loadingIndicator.classList.add('hidden');
            loadingIndicator.classList.remove('flex');

            // 更新结果计数
            const count = data.merchants?.length || 0;
            resultCount.textContent = `${count} 个结果`;

            renderSearchResults(data.merchants);
        })
        .catch(error => {
            console.error('Error:', error);
            loadingIndicator.classList.add('hidden');
            loadingIndicator.classList.remove('flex');

            document.getElementById('searchResultsContainer').innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <i class="fa fa-exclamation-triangle text-red-500 text-2xl"></i>
          </div>
          <h3 class="text-xl font-medium text-neutral-800 mb-2">搜索出错</h3>
          <p class="text-neutral-600 max-w-md">无法获取搜索结果，请稍后再试</p>
          <p class="text-red-500 mt-2">${error.message}</p>
        </div>
      `;
        });
}

// 渲染搜索结果
function renderSearchResults(results) {
    const container = document.getElementById('searchResultsContainer');

    if (!results || results.length === 0) {
        container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
          <i class="fa fa-search text-neutral-400 text-2xl"></i>
        </div>
        <h3 class="text-xl font-medium text-neutral-800 mb-2">没有找到匹配的菜品</h3>
        <p class="text-neutral-600 max-w-md">尝试使用不同的关键词或检查拼写</p>
        <a href="/" class="mt-4 inline-block bg-primary text-white px-6 py-2 rounded-full hover:bg-primary/90 transition-colors">
          返回搜索
        </a>
      </div>
    `;
        return;
    }

    // 渲染结果列表
    let html = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">';

    results.forEach((mer, index) => {
        // 延迟每个卡片的动画，创建级联效果
        const animationDelay = index * 0.1;

        html += `
     <a href="dianCan/${mer.merId}" class="block"> <div class="result-card" style="animation-delay: ${animationDelay}s">
        <div class="relative">
          <img src="${mer.imageUrl || 'https://picsum.photos/seed/food${index}/400/300'}" 
               alt="${mer.foodName || '美食图片'}" 
               class="w-full h-48 object-cover">
          ${mer.discount ? `<div class="discount-badge">${mer.discount}折</div>` : ''}
        </div>
        <div class="p-5">
          <h3 class="font-bold text-lg text-neutral-800 mb-1 line-clamp-1">${mer.shopName || '未知名称'}</h3>
          <div class="flex items-center mb-3">
            <div class="rating-stars">
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              ${parseFloat(mer.rating || 4.5) >= 4.5 ? '<i class="fa fa-star"></i>' : '<i class="fa fa-star-half-o"></i>'}
              <span class="ml-1 text-neutral-600">${mer.rating || 4.5}</span>
            </div>
            <span class="text-neutral-500 text-sm">${mer.reviewCount || 120} 条评价</span>
          </div>
          <p class="text-neutral-600 text-sm mb-4 line-clamp-1">${mer.leiXing || '未知类型'}</p>
         
        </div>
      </div>
      </a>
    `;
    });

    html += '</div>';
    container.innerHTML = html;
}