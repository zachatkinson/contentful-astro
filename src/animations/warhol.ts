export default function warholAnimation() {
    const heroElement = document.getElementById('hero-home');
    const styles = `
    @media (min-width: 640px) {
      .warhol-pic {
        background-image: url("${heroElement.dataset.desktopBg}") !important
      }
    }
    
    .warhol-container {
  width: 100%;
  height:100%;
  position:relative;
  overflow:hidden;
}
    .warhol-pic {
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    background-image: url("${heroElement.dataset.mobileBg}");
  width:100%;
  height:100%;
  position:absolute;
}

.a {
  background-size:100% 100%;
  filter:hue-rotate(72deg);
}

.b {
  background-size:105% 105%;
  filter:hue-rotate(144deg);
}

.c {
  background-size:110% 110%;
  filter:hue-rotate(216deg);
}

.d {
  background-size:115% 115%;
  filter:hue-rotate(288deg);
}


@keyframes a { 
  from {
    clip-path:inset(0 80% 80% 0);
  }
  25% {
    clip-path:inset(0 20% 80% 0);
  }
  50% {
    clip-path:inset(0 20% 20% 0);
  }
  75% {
    clip-path:inset(0 80% 20% 0);
  }
  to { 
    filter:hue-rotate(144deg)contrast(1.5);
    clip-path:inset(0 80% 80% 0);
  } 
}

@keyframes b { 
  from {
    clip-path:inset(0 0 80% 20%);
  }
  25% {
    clip-path:inset(0 0 80% 80%);
  }
  50% {
    clip-path:inset(0 0 20% 80%);
  }
  75% {
    clip-path:inset(0 0 20% 20%);
  }
  to { 
    filter:hue-rotate(216deg)contrast(1.5); 
    clip-path:inset(0 0 80% 20%);
  } 
}

@keyframes c { 
  from {
    clip-path:inset(20% 80% 0 0);
  }
  25% {
    clip-path:inset(20% 20% 0 0);
  }
  50% {
    clip-path:inset(80% 20% 0 0);
  }
  75% {
    clip-path:inset(80% 80% 0 0);
  }
  to { 
    clip-path:inset(20% 80% 0 0);
    filter:hue-rotate(288deg)contrast(1.5);
  } 
}

@keyframes d { 
  from {
    clip-path:inset(20% 0 0 20%);
  }
  25% {
    clip-path:inset(20% 0 0 80%);
  }
  50% {
    clip-path:inset(80% 0 0 80%);
  }
  75% {
    clip-path:inset(80% 0 0 20%);
  }
  to { 
    clip-path:inset(20% 0 0 20%);
    filter:hue-rotate(72deg)contrast(1.5);
  } 
}

.a {animation:a 9s infinite;}
.b {animation:b 9s infinite;}
.c {animation:c 9s infinite;}
.d {animation:d 9s infinite;}
    `
    return styles;
}
