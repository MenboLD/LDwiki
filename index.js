// index.js（共通ヘッダー導入後）

// カテゴリカードクリックで data-link に遷移（今は #）
document.querySelectorAll('.category-card').forEach(card => {
  card.addEventListener('click', () => {
    const link = card.getAttribute('data-link') || '#';
    window.location.href = link;
  });
});
