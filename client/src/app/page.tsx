// import { Button } from "@/components/ui/button"
import NavBar from "@/components/NavBar";
import Landing from "./(nondashboard)/landing/page";

export default function Home() {
  return (
    <div className="w-full h-full">
      <NavBar />
      <main className={`flex flex-col w-full h-full`}>
        <Landing />
      </main>
      {/* <Button variant={'outline'} size={'lg'}>Click me</Button> */}
    </div>
  );
}
