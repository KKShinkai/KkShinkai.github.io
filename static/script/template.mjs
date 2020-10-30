export default ({ title, body, date }) => `
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>${title} &middot; Kk Shinkai</title>
    <link rel="apple-touch-icon" sizes="180x180" href="../apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="../favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="../favicon-16x16.png">
    <link rel="manifest" href="../site.webmanifest">
    <link rel="stylesheet" href="../static/css/normalize-v8.0.1.css">
    <link rel="stylesheet" href="../static/css/kkshinkai-common-v1.0.0.css">
    <link rel="stylesheet" href="../static/css/kkshinkai-v7.0.0.css">
</head>
<body>
<header id="header">
    <h1 class="title">${title}</h1>
    <div><time datetime="${date}">${new Date(date).toDateString()}</time> &middot; Kk Shinkai</div>
</header>
<main>
${body}
</main>
</body>
</html>`.trim();
