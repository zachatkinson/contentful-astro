export default function shakeAnimation() {
    const heroElement = document.getElementById('hero-home');
    if (heroElement) {
        return `
            @media (min-width: 640px) {
          .shake {
            background-image: url("${heroElement.dataset.desktopBg}") !important
          }
          .shake:before{
            background-image: url("${heroElement.dataset.desktopBg}") !important
          }
        }
        .shake
      {
        display: grid;
        width: 100%;
        height: 100%;
        background: url("${heroElement.dataset.mobileBg}");
        background-size: cover;
      }
    
    .shake:before
      {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: url("${heroElement.dataset.mobileBg}");
        background-size: cover; /* contain for split effect */
        opacity: .5;
        mix-blend-mode: hard-light;
        animation: glitch2 10s linear infinite;
      }
    
    .shake:hover:before
    {
        animation: glitch1 4s linear infinite;
    }
    
    @keyframes glitch1
    {
        0%
        {
            background-position: 0 0;
            filter: hue-rotate(0deg);
        }
        10%
        {
            background-position: 5px 0;
        }
        20%
        {
            background-position: -5px 0;
        }
        30%
        {
            background-position: 15px 0;
        }
        40%
        {
            background-position: -5px 0;
        }
        50%
        {
            background-position: -25px 0;
        }
        60%
        {
            background-position: -50px 0;
        }
        70%
        {
            background-position: 0 -20px;
        }
        80%
        {
            background-position: -60px -20px;
        }
        81%
        {
            background-position: 0 0;
        }
        100%
        {
            background-position: 0 0;
            filter: hue-rotate(360deg);
        }
    }
    
    @keyframes glitch2
    {
        0%
        {
            background-position: 0 0;
            filter: hue-rotate(0deg);
        }
        10%
        {
            background-position: 15px 0;
        }
        15%
        {
            background-position: -15px 0;
        }
        20%
        {
            filter: hue-rotate(360deg);
        }
      25%
        {
            background-position: 0 0;
            filter: hue-rotate(0deg);
        }
      100%
        {
            background-position: 0 0;
            filter: hue-rotate(0deg);
        }
    }`
    }
}

