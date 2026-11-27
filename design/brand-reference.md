# Referência de marca — Plataforma Assaad

Extraído de `lp.plataformaassaad.com.br` (LP de vendas, campanha Black Friday 2026) e `plataformaassaad.com.br/blog` em 2026-11-27.

A marca tem **duas linguagens visuais**:

| | LP de vendas (funil) | Institucional / blog |
|---|---|---|
| Tom | Energético, urgente, "caderno de estudante" | Limpo, editorial |
| Títulos | Condensada caixa-alta (Anton / Zuume) | Inter, peso médio |
| Corpo | Rubik | Inter / system |
| Azul principal | `#0A6DE6` (fundo), `#0A7FFA` | `#0021E1` (logo) |
| Fundo | Papel quadriculado | Gradiente pastel azul→pêssego |

**Proposta:** quiz público segue a LP (é canal de aquisição, mesmo público), sem a urgência de Black Friday. Admin segue o institucional (ferramenta interna, densidade de dados).

## Tokens da LP (CSS vars originais)

```css
--tinta:        #0B2A5B; /* texto principal (azul-marinho) */
--tinta-2:      #3A4F73; /* texto secundário */
--azul:         #0A7FFA;
--azul-fundo:   #0A6DE6; /* blocos/hero azuis */
--azul-texto:   #0866D6; /* links e destaques em texto */
--azul-esc:     #0749A8;
--azul-claro:   #DCEBFF;
--papel:        #FBFDFF; /* fundo */
--grade:        rgba(10,127,250,.08); /* linhas do quadriculado */
--amarelo:      #FFE100; /* marca-texto, selos */
--amarelo-esc:  #D9AE00;
--verde-cta:    #0D8519;
--verde-cta-esc:#075E10;
--verde-claro:  #C9F5D6;
--vermelho:     #F50E01; /* urgência — evitar no quiz */
--vermelho-texto:#D90D00;
--laranja:      #FF8A1F;
--rosa:         #FF4F9A;
--turquesa:     #12BFB0;
--ciano:        #2BE6FF;
```

CTA principal: pill (`border-radius: 999px`), gradiente verde `linear-gradient(90deg, #13AD20, #2FD15A)`, texto branco caixa-alta, ícone à esquerda.

Raios mais usados: `999px` (pills), `10–12px` (inputs/chips), `16–22px` (cards).

## Tipografia

- **Títulos:** Anton (Google Fonts) — caixa-alta, condensada. Zuume é paga; Anton é o fallback que eles mesmos usam.
- **Destaque:** Clash Display 700 (Fontshare, gratuita).
- **Corpo:** Rubik 300–900 (Google Fonts).
- **Anotações manuscritas:** Kalam (Google Fonts) — setas e notas "à mão" ao redor do conteúdo.
- **Admin:** Inter.

## Elementos de linguagem visual (LP)

- Fundo papel quadriculado (grade azul a 8%).
- Palavra-chave do título em amarelo ou sublinhada com traço "pincel" SVG.
- Selos tipo fita adesiva (tape) levemente rotacionados.
- Notas manuscritas com setas desenhadas.
- Chips/pills pequenos para atributos (ex.: "Pix", "Boleto").
- Prova social: avatares sobrepostos + "Mais de 20.000 alunos".
- Cards brancos com sombra suave sobre fundo quadriculado.

## Institucional (blog)

- Logo azul `#0021E1`, SVG com `fill="currentColor"` (troca de cor via CSS).
- Cards brancos com borda cinza clara, raio 8–16px, botão "Ver questões" pill outline azul.
- Texto `#333333`, secundário `#69727D`.

## Assets salvos (`design/assets/`)

- `logo-plataforma-assaad.svg` — logo oficial (698×199, `currentColor`).
- `favicon-192.webp` — ícone.

## Telas (`design/canvas/`)

HTML das 8 telas desenhadas no canvas "Quiz ENEM — Telas" (formato `.dc.html` do editor de design; abrir o arquivo mostra o markup e os estilos de cada tela). `Main.dc.html` é a tela inicial do quiz.
