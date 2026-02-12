(function(){
  const canvas=document.getElementById('particles-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  let w,h,particles=[];
  const COUNT=80,MAX_DIST=120;

  function resize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight;}
  resize();
  window.addEventListener('resize',resize);

  function Particle(){
    this.x=Math.random()*w;
    this.y=Math.random()*h;
    this.vx=(Math.random()-.5)*.4;
    this.vy=(Math.random()-.5)*.4;
    this.r=Math.random()*2+1;
    this.o=Math.random()*.5+.3;
  }

  for(let i=0;i<COUNT;i++)particles.push(new Particle());

  function draw(){
    ctx.clearRect(0,0,w,h);
    for(let i=0;i<particles.length;i++){
      const p=particles[i];
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>w)p.vx*=-1;
      if(p.y<0||p.y>h)p.vy*=-1;

      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(212,175,55,${p.o})`;
      ctx.fill();

      for(let j=i+1;j<particles.length;j++){
        const q=particles[j];
        const dx=p.x-q.x,dy=p.y-q.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<MAX_DIST){
          ctx.beginPath();
          ctx.moveTo(p.x,p.y);
          ctx.lineTo(q.x,q.y);
          ctx.strokeStyle=`rgba(212,175,55,${.3*(1-dist/MAX_DIST)})`;
          ctx.lineWidth=.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
