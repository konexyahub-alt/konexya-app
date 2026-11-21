// Pós-produção: cena em HDR com MSAA → profundidade de campo → bloom → grade final
// (tonemapping ACES, vinheta, grão com semente = número do quadro, fade para preto).
import * as THREE from "three";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { POST } from "../config.js";

export function createPost(renderer, w, h) {
  const depthTexture = new THREE.DepthTexture(w, h);
  depthTexture.type = THREE.FloatType; // 32 bits: chão, asfalto e rota a centímetros de distância sem conflito
  const sceneRT = new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    samples: POST.msaa,
    depthTexture,
  });
  const dofRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });

  const dof = new FullScreenQuad(
    new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: sceneRT.texture },
        tDepth: { value: depthTexture },
        uNear: { value: 1 },
        uFar: { value: 4000 },
        uFocus: { value: 400 },
        uRange: { value: POST.dof.focusRange },
        uMaxBlur: { value: POST.dof.maxBlur },
        uTexel: { value: new THREE.Vector2(1 / w, 1 / h) },
        uScale: { value: h / 1920 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tColor, tDepth; uniform float uNear, uFar, uFocus, uRange, uMaxBlur, uScale; uniform vec2 uTexel;
        varying vec2 vUv;
        float linDepth(vec2 uv){
          float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
          return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
        }
        float coc(float d){ return clamp(abs(d - uFocus) / (uFocus * uRange) - 0.35, 0.0, 1.0); }
        void main(){
          float c0 = coc(linDepth(vUv));
          vec3 sum = texture2D(tColor, vUv).rgb; float wsum = 1.0;
          float rad = c0 * uMaxBlur * uScale;
          if (rad > 0.35) {
            // Disco de amostragem no ângulo áureo (fixo, sem ruído).
            for (int i = 1; i < 32; i++) {
              float fi = float(i);
              float r = sqrt(fi / 32.0) * rad;
              float a = fi * 2.39996323;
              vec2 o = vec2(cos(a), sin(a)) * r * uTexel;
              float ci = coc(linDepth(vUv + o));
              // Amostras nítidas na frente não vazam para o fundo desfocado e vice-versa.
              float w = smoothstep(0.0, 1.0, ci * uMaxBlur * uScale - r + 1.0);
              sum += texture2D(tColor, vUv + o).rgb * w; wsum += w;
            }
          }
          gl_FragColor = vec4(sum / wsum, 1.0);
        }`,
    }),
  );

  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), POST.bloom.strength, POST.bloom.radius, POST.bloom.threshold);

  const grade = new FullScreenQuad(
    new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: dofRT.texture },
        uExposure: { value: 1 },
        uFade: { value: 0 },
        uFrame: { value: 0 },
        uGrain: { value: POST.grain },
        uVignette: { value: POST.vignette },
        uRes: { value: new THREE.Vector2(w, h) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tColor; uniform float uExposure, uFade, uFrame, uGrain, uVignette; uniform vec2 uRes;
        varying vec2 vUv;
        vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
        vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
        float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
        void main(){
          vec3 c = texture2D(tColor, vUv).rgb * uExposure;
          // Monocromático com leve frieza nas sombras (sem virar "cor").
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = mix(vec3(l), c, 0.35);
          c *= mix(vec3(0.97, 0.985, 1.03), vec3(1.0), smoothstep(0.0, 0.6, l));
          c = aces(c);
          vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
          c *= 1.0 - uVignette * smoothstep(0.25, 0.95, length(q) * 1.25);
          c *= 1.0 - uFade;
          vec3 s = toSRGB(c);
          // Grão: depende do pixel e do número do quadro (reprodutível).
          float g = h(gl_FragCoord.xy + uFrame * 17.0) - 0.5;
          s += g * uGrain * (1.0 - uFade);
          gl_FragColor = vec4(s, 1.0);
        }`,
    }),
  );

  return {
    sceneRT,
    render(scene, camera, { focus, exposure, fade, frame, bloomGain }) {
      renderer.setRenderTarget(sceneRT);
      renderer.clear();
      renderer.render(scene, camera);

      const u = dof.material.uniforms;
      u.uNear.value = camera.near;
      u.uFar.value = camera.far;
      u.uFocus.value = focus;
      renderer.setRenderTarget(dofRT);
      dof.render(renderer);

      bloom.strength = POST.bloom.strength * bloomGain;
      bloom.render(renderer, null, dofRT, 0, false);

      const g = grade.material.uniforms;
      g.uExposure.value = exposure;
      g.uFade.value = fade;
      g.uFrame.value = frame;
      renderer.setRenderTarget(null);
      grade.render(renderer);
    },
  };
}
