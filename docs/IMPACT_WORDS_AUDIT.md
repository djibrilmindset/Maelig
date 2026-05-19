# Audit mots impactants — Colorisation différentielle

## Pourquoi
Sur une landing dense, les patrons BTP scannent plus qu'ils ne lisent. Pour rendre la lecture *instinctive*, on colore les mots à forte charge émotionnelle selon **5 catégories**. L'œil capte la promesse sans avoir à lire la phrase entière.

## Composant
```tsx
import { DepImpact } from "@/components/dep/primitives"

<DepImpact tone="gain">récupères</DepImpact>
```

## Les 5 tones

| Tone | Couleur | Quand l'utiliser | Exemples |
|------|---------|------------------|----------|
| `gain` | `var(--wire-green)` | Bénéfice client, argent récupéré, temps gagné | récupères, gagné, encaissé, payé, +29 120 € |
| `pain` | `var(--wire-red)` | Douleur ancienne, ce qu'on évite, friction passée | perdu, jamais, tapes une heure, −29 120 €, plus aucune consigne perdue |
| `action` | `var(--dep-yellow)` italique | Verbe d'action principal, geste produit | Parlez, dictes, voix, chantier, facturé |
| `proof` | `var(--dep-yellow)` mono | Chiffres, métriques, preuves quantifiables | 4 min, 14 jours, 20 langues, 5 €/mois |
| `trust` | `var(--wire-blue)` | Sécurité, conformité, garanties | RGPD strict, Factur-X, sans CB, chiffré |

## Règles de placement
1. **1 à 3 impacts par phrase max** : au-delà, l'effet s'annule.
2. **Pas dans les titres H1/H2 entiers** : seulement le mot pivot.
3. **Jamais sur du texte de remplissage** : connecteurs, articles, etc.
4. **Cohérence inter-pages** : même mot = même tone partout.
5. **Mobile** : les tones restent lisibles, pas de soulignement par défaut (option `underline`).

## Inventaire actuel des mots taggés (Landing)

### Hero
- `Parlez` (action) · `facturé` (action) · `parles` (action) · `t'es payé` (gain) · `20 langues` (proof)

### Stats sous hero
- `chantier` (action) · `Récupérés` (gain)

### Multilingue
- `plus aucune consigne perdue` (pain)

### Pricing — comparaison
- `−29 120 €` (pain) · `récupères` (gain) · `+29 120 €` (gain)

### Parcours
- `voix` (action) · `cash` (gain)

### CTA final
- `dictes` (action) · `4 min` (proof) · `tapes une heure` (pain) · `14 jours` (proof) · `Pas de CB` (trust) · `RGPD strict` (trust)

### Eyebrow Pricing
- `sans CB` (trust)

## Effet visuel
Chaque tone ajoute :
- Une couleur de texte distincte
- Un poids `font-weight: 600-700`
- Un `text-shadow` coloré ultra-léger pour faire scintiller le mot sans le surcharger
- Le tone `proof` passe automatiquement en `tabular-nums` mono pour les chiffres

`prefers-reduced-motion` désactive le shadow pour les utilisateurs sensibles.

## Audit futur (TODO)
- Étendre aux pages `Comparaison`, `FAQ`, `Témoignages`
- Tester A/B le tone `pain` (peut-être trop agressif sur certains segments)
- Ajouter un linter ESLint qui flagge les mots à fort impact non taggés
