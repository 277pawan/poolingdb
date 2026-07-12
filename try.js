import { useEffect } from "react";

useEffect(() => {

    const controller = new AbortController();
    try {

        const fetchUsers = async () => {
            const response = await fetch('http://dummyjson.com/users',
                {
                    signal: controller.signal,
                }
            );
            const result=await response.json();
            console.log(result);
        }
        fetchUsers();
    }
    catch (error) {
        console.log(error)
    }

    return () => controller.abort();
})