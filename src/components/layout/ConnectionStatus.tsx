
import { useSocket } from "../../components/context/SocketContext";

export default function ConnectionStatus() {
  const { isConnected } = useSocket();

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          isConnected ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span className="text-sm text-gray-400">
        {isConnected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}
