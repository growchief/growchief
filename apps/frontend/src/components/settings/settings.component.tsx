import { useSubRoutes } from "@growchief/frontend/utils/sub.routes.context";
import {
  Route,
  Routes,
  Link,
  Navigate,
  useLocation,
  matchPath,
} from "react-router";
import { LineIcon } from "@growchief/frontend/components/icons/line.icon.tsx";
import { type FC, useCallback } from "react";
import type { OneRoute } from "@growchief/frontend/routes.tsx";
import clsx from "clsx";
import { useDecisionModal } from "@growchief/frontend/utils/use.decision.modal.tsx";
import { emitter, useFetch } from "@growchief/frontend/utils/use.fetch.tsx";

export const InnerMenu: FC<{ item: OneRoute }> = ({
  item: { path, label },
}) => {
  const location = useLocation();

  // Exact on "/", prefix match for others
  const isActive = !!matchPath(
    { path: ("/settings" + path) as string, end: false },
    location.pathname,
  );

  return (
    <Link
      to={"/settings" + path}
      className={clsx(
        "cursor-pointer flex items-center gap-[12px] group/profile hover:bg-boxHover rounded-e-[8px]",
        isActive && "bg-boxHover",
      )}
    >
      <div
        className={clsx(
          "h-full w-[4px] rounded-s-[3px] opacity-0 group-hover/profile:opacity-100 transition-opacity",
          isActive && "opacity-100",
        )}
      >
        <LineIcon />
      </div>
      {label}
    </Link>
  );
};
export const SettingsComponent = () => {
  const { routes } = useSubRoutes();
  const fetch = useFetch();
  const decision = useDecisionModal();

  const logout = useCallback(async () => {
    const logout = await decision.open({
      label: "Logout",
      description: "Are you sure you want to logout?",
      approveLabel: "Logout",
      cancelLabel: "Cancel",
    });

    if (logout) {
      await fetch("/users/logout", {
        method: "POST",
      });

      emitter.emit("event", { name: "logout" });
    }
  }, []);

  return (
    <div className="flex-1 flex gap-[1px]">
      <div className="bg-innerBackground p-[20px] flex flex-col w-[260px]">
        <div className="flex flex-1 flex-col gap-[15px]">
          <div className="flex flex-col gap-[8px]">
            {routes?.map((route) => (
              <InnerMenu item={route} />
            ))}
          </div>
        </div>
        <div
          onClick={logout}
          className="text-red-600 hover:underline hover:font-bold cursor-pointer"
        >
          Logout
        </div>
      </div>
      <div className="bg-innerBackground flex-1 flex-col flex p-[20px] gap-[12px]">
        <Routes>
          <Route
            path="/"
            element={
              <Navigate to={("/settings" + routes?.[0]?.path) as string} />
            }
          />
          {routes?.map((route) => (
            <Route key={route.label} {...route} />
          ))}
          <Route
            path="*"
            element={
              <Navigate to={("/settings" + routes?.[0]?.path) as string} />
            }
          />
        </Routes>
      </div>
    </div>
  );
};
