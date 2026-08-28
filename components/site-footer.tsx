const aboutLinks = [
  ['Our team', 'https://www.wildteam.org.uk/team'],
  ['Our plan', 'https://www.wildteam.org.uk/conservation-plan'],
  ['Our impact', 'https://www.wildteam.org.uk/conservation-impact'],
  ['Our partners', 'https://www.wildteam.org.uk/conservation-partners'],
  ['Get in touch', 'https://training.wildteam.org.uk/contact-us'],
  ['Community', 'https://training.wildteam.org.uk/social'],
  ['Newsletter', '/#newsletter'],
];

const exploreLinks = [
  ['Success stories', 'https://training.wildteam.org.uk/success-stories'],
  ['Blog', 'https://training.wildteam.org.uk/blog'],
  ['Courses', 'https://training.wildteam.org.uk/courses'],
  ['Bursaries', 'https://training.wildteam.org.uk/bursaries'],
  ['Team membership', 'https://training.wildteam.org.uk/pricing-teams'],
  ['Conservation Trainers Network', 'https://training.wildteam.org.uk/conservation-trainers-network'],
];

const legalLinks = [
  ['Terms and conditions', 'https://training.wildteam.org.uk/terms'],
  ['Cookies', 'https://training.wildteam.org.uk/cookies'],
  ['Privacy Policy', 'https://training.wildteam.org.uk/privacy'],
  ['Annual report', 'https://register-of-charities.charitycommission.gov.uk/charity-search/-/charity-details/5031203'],
  ['CPD', 'https://training.wildteam.org.uk/cpd-certification'],
];

function FooterLinks({ title, links }: { title: string; links: string[][] }) {
  return <section className="wildteam-footer-column"><h2>{title}</h2>{links.map(([label, href]) => <a href={href} key={label} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{label}</a>)}</section>;
}

export function SiteFooter() {
  return <footer className="wildteam-footer">
    <div className="shell">
      <div className="wildteam-footer-grid">
        <FooterLinks title="About" links={aboutLinks} />
        <FooterLinks title="Explore" links={exploreLinks} />
        <FooterLinks title="Legal" links={legalLinks} />
        <section className="wildteam-footer-column wildteam-socials">
          <h2>Join the conversation</h2>
          <div className="wildteam-social-links">
            <a href="https://www.linkedin.com/company/wildteam-uk/" target="_blank" rel="noreferrer" aria-label="WildTeam on LinkedIn">in</a>
            <a href="https://www.youtube.com/channel/UCUUcxfaUjtX4dl4zs4gMjSg" target="_blank" rel="noreferrer" aria-label="WildTeam on YouTube">YT</a>
            <a href="https://www.facebook.com/WildTeamUK/" target="_blank" rel="noreferrer" aria-label="WildTeam on Facebook">f</a>
            <a href="https://www.instagram.com/wildteamuk/" target="_blank" rel="noreferrer" aria-label="WildTeam on Instagram">IG</a>
          </div>
          <a className="wildteam-cpd-link" href="https://training.wildteam.org.uk/cpd-certification" target="_blank" rel="noreferrer"><img src="https://lwfiles.mycourse.app/6874ec826e31c5cf606cc001-public/24d306bb870071d95fb156827191ca00.png" alt="CPD certification" /></a>
        </section>
      </div>
      <div className="wildteam-footer-mission">
        <h2>Empowering conservationists to restore nature</h2>
        <p>We give conservationists worldwide the knowledge, the skills, and the community support they need to design and deliver conservation projects that have more impact.</p>
        <small>WILDTEAM is a registered charity in England and Wales. Number 1149465. © 2026 by WildTeam</small>
      </div>
    </div>
  </footer>;
}
