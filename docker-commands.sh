#!/bin/bash

# QuizMaster Docker Quick Commands
# Make this file executable: chmod +x docker-commands.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}QuizMaster Docker Management${NC}"
echo "================================"
echo ""

# Function to display menu
show_menu() {
    echo "Select an option:"
    echo "1) Start all services"
    echo "2) Stop all services"
    echo "3) Restart all services"
    echo "4) View logs (all)"
    echo "5) View server logs"
    echo "6) View client logs"
    echo "7) Rebuild and restart"
    echo "8) Check container status"
    echo "9) Backup database"
    echo "10) Clean up (remove containers and volumes)"
    echo "11) Execute shell in server"
    echo "12) Execute shell in client"
    echo "13) Run database migrations"
    echo "14) View resource usage"
    echo "0) Exit"
    echo ""
}

# Main loop
while true; do
    show_menu
    read -p "Enter choice: " choice
    echo ""

    case $choice in
        1)
            echo -e "${GREEN}Starting all services...${NC}"
            docker-compose up -d
            echo -e "${GREEN}Services started!${NC}"
            ;;
        2)
            echo -e "${YELLOW}Stopping all services...${NC}"
            docker-compose down
            echo -e "${GREEN}Services stopped!${NC}"
            ;;
        3)
            echo -e "${YELLOW}Restarting all services...${NC}"
            docker-compose restart
            echo -e "${GREEN}Services restarted!${NC}"
            ;;
        4)
            echo -e "${GREEN}Viewing all logs (Ctrl+C to exit)...${NC}"
            docker-compose logs -f
            ;;
        5)
            echo -e "${GREEN}Viewing server logs (Ctrl+C to exit)...${NC}"
            docker-compose logs -f server
            ;;
        6)
            echo -e "${GREEN}Viewing client logs (Ctrl+C to exit)...${NC}"
            docker-compose logs -f client
            ;;
        7)
            echo -e "${YELLOW}Rebuilding and restarting...${NC}"
            docker-compose up -d --build
            echo -e "${GREEN}Rebuild complete!${NC}"
            ;;
        8)
            echo -e "${GREEN}Container status:${NC}"
            docker-compose ps
            echo ""
            docker ps --filter "name=quizmaster"
            ;;
        9)
            echo -e "${GREEN}Creating database backup...${NC}"
            BACKUP_FILE="database-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
            docker run --rm -v quizmaster_server-data:/data -v $(pwd):/backup alpine tar czf /backup/$BACKUP_FILE -C /data .
            echo -e "${GREEN}Backup created: $BACKUP_FILE${NC}"
            ;;
        10)
            echo -e "${RED}WARNING: This will remove all containers and volumes!${NC}"
            read -p "Are you sure? (yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                docker-compose down -v
                echo -e "${GREEN}Cleanup complete!${NC}"
            else
                echo -e "${YELLOW}Cleanup cancelled${NC}"
            fi
            ;;
        11)
            echo -e "${GREEN}Opening server shell...${NC}"
            docker-compose exec server sh
            ;;
        12)
            echo -e "${GREEN}Opening client shell...${NC}"
            docker-compose exec client sh
            ;;
        13)
            echo -e "${GREEN}Running database migrations...${NC}"
            docker-compose exec server npm run migrate
            echo -e "${GREEN}Migrations complete!${NC}"
            ;;
        14)
            echo -e "${GREEN}Resource usage:${NC}"
            docker stats --no-stream quizmaster-server quizmaster-client
            ;;
        0)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please try again.${NC}"
            ;;
    esac
    echo ""
    read -p "Press Enter to continue..."
    clear
done
