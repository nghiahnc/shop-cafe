import Header, { type HeaderProps } from '@/components/boutique/Header';
export default function HomeHeader(props: Omit<HeaderProps, 'hero'>) { return <Header {...props} hero/>; }
