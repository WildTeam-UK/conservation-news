import { Brand } from '@/components/brand';

const footerLinks = [
  ['About', '/about'],
  ['Training', 'https://training.wildteam.org.uk/'],
  ['Careers', 'https://www.wildteam.org.uk/jobs'],
  ['Newsletter', '/#newsletter'],
  ['How we use AI', '/how-we-use-ai'],
  ['Coverage analysis', '/how-leaning-works'],
];

const socialLinks = [
  ['LinkedIn', 'https://www.linkedin.com/company/wildteam-uk/'],
  ['Instagram', 'https://www.instagram.com/wildteamuk/'],
  ['YouTube', 'https://www.youtube.com/channel/UCUUcxfaUjtX4dl4zs4gMjSg'],
];

export function SiteFooter() {
  return <footer className="wildteam-footer site-footer-simple">
    <div className="shell simple-footer-inner">
      <div className="simple-footer-top">
        <div className="simple-footer-brand">
          <Brand />
          <p>Independent conservation news, clearly told.</p>
        </div>
        <nav className="simple-footer-nav" aria-label="Footer navigation">
          {footerLinks.map(([label, href]) => <a href={href} key={label} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{label}</a>)}
        </nav>
      </div>
      <div className="simple-footer-bottom">
        <p>WILDTEAM is a registered charity in England and Wales, number 1149465. © 2026 WildTeam.</p>
        <div>{socialLinks.map(([label, href]) => <a href={href} target="_blank" rel="noreferrer" key={label}>{label}</a>)}</div>
      </div>
    </div>
  </footer>;
}
