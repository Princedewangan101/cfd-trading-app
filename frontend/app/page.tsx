
import Appbar from "@/components/appComponents/Appbar";
import Corousal from "@/components/appComponents/homePageComponents/Corousal";
import Symbols from "@/components/appComponents/homePageComponents/Symbols";
import { useAppStore } from "@/store/store";

export default function Home() {



  return (
    <div>
<Appbar/>
      <Corousal />
      <Symbols />
    </div>
  );
}
